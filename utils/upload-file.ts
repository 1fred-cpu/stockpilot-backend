import { Multer } from 'multer';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
@Injectable()
export class FileUploadService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: any,
  ) {}

  async uploadFile(file: Multer.File | null, path: string, bucket: string) {
    if (!file) return null;

    const { data, error } = await this.supabase.storage
      .from(bucket) // bucket name
      .upload(path, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype,
      });

    if (error) {
      throw new BadRequestException(
        `Supabase Error uploading file: ${error.message}`,
      );
    }

    // If bucket is PUBLIC:
    const { data: pub } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  async deleteFile(path: string, bucket: string) {
    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);
      if (error) {
        throw new BadRequestException(
          `Supabase Error deleting file: ${error.message}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}
