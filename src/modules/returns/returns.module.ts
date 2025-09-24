import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { Return } from '../../entities/return.entity';
import { Refund, RefundStatus } from '../../entities/refund.entity';
import { Exchange, ExchangeStatus } from '../../entities/exchange.entity';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { ProductVariant } from '../../entities/producr-variants.entity';
import { StoreCredit } from '../../entities/store-credit.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HandleErrorService } from '../../helpers/handle-error.helper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      StoreInventory,
      ProductVariant,
      StoreCredit,
    ]),
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService, HandleErrorService],
})
export class ReturnsModule {}
