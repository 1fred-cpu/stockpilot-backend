import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';
import { ProductsController } from './products.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { DiscountsModule } from '../discounts/discounts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Business } from '../../entities/business.entity';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { Category } from 'src/entities/category.entity';
import { FailedFileDeletion } from '../../entities/failed-file-deletion.entity';
import { QrcodeModule } from '../qrcode/qrcode.module';
@Module({
  imports: [
    QrcodeModule,
    SupabaseModule,
    DiscountsModule,
    TypeOrmModule.forFeature([
      Business,
      StoreInventory,
      ProductVariant,
      Product,
      Category,
      FailedFileDeletion,
    ]),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    VariantsService,
    FileUploadService,
    HandleErrorService,
  ],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
