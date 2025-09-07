import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SupabaseModule } from '../src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';
import { DiscountsModule } from '../src/modules/discounts/discounts.module';
@Module({
  imports: [SupabaseModule, DiscountsModule],
  controllers: [ProductsController],
  providers: [ProductsService, FileUploadService],
})
export class ProductsModule {}
