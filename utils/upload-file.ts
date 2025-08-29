import { Multer } from 'multer';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
@Injectable()
export class FileUploadService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: any,
  ) {}

  async uploadFile(file: Multer.File | null, path: string, bucket: string) {
    if (!file) return null;
    // const path = `stores/${storeName}/${Date.now()}_${file.originalname}`;

    const { data, error } = await this.supabase.storage
      .from(bucket) // bucket name
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    if (error) {
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }

    // If bucket is PUBLIC:
    const { data: pub } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }
}
