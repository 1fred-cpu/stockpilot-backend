import { Multer } from "multer";
import {
    BadRequestException,
    Inject,
    Injectable,
    InternalServerErrorException
} from "@nestjs/common";
@Injectable()
export class FileUploadService {
    constructor(
        @Inject("SUPABASE_CLIENT")
        private readonly supabase: any
    ) {}

    async uploadFile(file: Multer.File | null, path: string, bucket: string) {
        if (!file) return null;

        const { data, error } = await this.supabase.storage
            .from(bucket) // bucket name
            .upload(path, file.buffer, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.mimetype
            });

        if (error) {
            throw new BadRequestException(
                `Supabase Error uploading file: ${error.message}`
            );
        }

        // If bucket is PUBLIC:
        const { data: pub } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        return pub.publicUrl;
    }

    async uploadPdfFile(file: Buffer | null, path: string, bucket: string) {
        if (!file) return null;

        const { data, error } = await this.supabase.storage
            .from(bucket) // bucket name
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: "application/pdf"
            });

        if (error) {
            throw new BadRequestException(
                `Supabase Error uploading file: ${error.message}`
            );
        }

        // If bucket is PUBLIC:
        const { data: pub } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        return pub.publicUrl;
    }

    async deleteFolder(prefix: string, bucket: string) {
        try {
            // 1. List all files under the prefix
            const { data, error: listError } = await this.supabase.storage
                .from(bucket)
                .list(prefix, { limit: 1000, recursive: true }); // recursive is important

            if (listError) throw listError;

            if (!data || data.length === 0) {
                return { message: "No files found under this prefix" };
            }

            // 2. Build file paths to delete
            const filePaths = data.map(file => `${prefix}/${file.name}`);

            // 3. Delete them
            const { error: deleteError } = await this.supabase.storage
                .from(bucket)
                .remove(filePaths);

            if (deleteError) throw deleteError;

            return {
                message: `Deleted ${filePaths.length} files from ${prefix}`
            };
        } catch (err) {
            throw new BadRequestException(
                `Failed to delete folder ${prefix}: ${err.message}`
            );
        }
    }

    async deleteFile(path: string, bucket: string) {
        try {
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([path]);
            if (error) {
                throw new BadRequestException(
                    `Supabase Error deleting file: ${error.message}`
                );
            }
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(
                `Failed to delete file: ${error.message}`
            );
        }
    }
}
