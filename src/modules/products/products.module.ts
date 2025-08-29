import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SupabaseModule } from '../../../lib/supabase.module';
import { FileUploadService } from 'utils/upload-file';
@Module({
  imports: [SupabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, FileUploadService],
})
export class ProductsModule {}
