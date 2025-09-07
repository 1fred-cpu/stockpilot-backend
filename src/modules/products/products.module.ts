import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';
import { InventoryService } from './inventory.service';
import { ProductsController } from './products.controller';
import { VariantsController } from './variants.controller';
import { InventoryController } from './inventory.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';

@Module({
  imports: [SupabaseModule],
  controllers: [ProductsController, VariantsController, InventoryController],
  providers: [ProductsService, VariantsService, InventoryService],
  exports: [
    ProductsService,
    VariantsService,
    InventoryService,
    FileUploadService,
  ],
})
export class ProductsModule {}
