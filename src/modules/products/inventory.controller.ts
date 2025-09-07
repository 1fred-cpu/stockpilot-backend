import { Controller, Post, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { SellDto } from './dto/sell.dto';

@Controller('stores/:storeId/inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Post('restock')
  restock(@Param('storeId') storeId: string, @Body() dto: RestockDto) {
    return this.svc.restock(storeId, dto);
  }

  @Post('sell')
  sell(@Param('storeId') storeId: string, @Body() dto: SellDto) {
    return this.svc.sell(storeId, dto);
  }

  @Post('expiring')
  expiring(@Param('storeId') storeId: string, @Body() body: { days?: number }) {
    return this.svc.getExpiringBatches(storeId, body.days ?? 7);
  }
}
