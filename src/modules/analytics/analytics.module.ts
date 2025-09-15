import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { SupabaseModule } from '../../lib/supabase.module';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { Sale } from 'src/entities/sale.entity';
import { Product } from 'src/entities/product.entity';
import { StoreInventory } from 'src/entities/store-inventory.entity';
import { Customer } from 'src/entities/customer.entity';
import { SaleItem } from 'src/entities/sale-item.entity';

@Module({
  imports: [
    SupabaseModule,
    TypeOrmModule.forFeature([
      Store,
      Sale,
      Product,
      StoreInventory,
      Customer,
      SaleItem,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, HandleErrorService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
