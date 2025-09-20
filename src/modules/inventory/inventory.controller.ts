import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Patch,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { DeductStockDto } from './dto/deduct-stock.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Restock a variant (with or without batches)
   */
  @Post('restock')
  async restock(
    @Body(new ValidationPipe({ transform: true })) dto: RestockDto,
  ) {
    console.log('Received DTO:', dto);
    const parsedVariants =
      typeof dto?.variants === 'string'
        ? JSON.parse(dto?.variants)
        : dto?.variants;
    dto.variants = parsedVariants;

    return this.inventoryService.restockVariants(dto);
  }

  /**
   * Deduct stock (e.g., sales, refunds, wastage)
   */
  @Post('deduct')
  async deductStock(@Body() dto: DeductStockDto) {
    return this.inventoryService.deductStock(dto);
  }

  /**
   * Get all inventory for a store
   */
  @Get('store/:storeId')
  async getInventoryByStore(@Param('storeId') storeId: string) {
    return this.inventoryService.getInventoryByStore(storeId);
  }

  /**
   * Get low and out stocks  for a store
   */
  @Get('low-and-out-stocks/:storeId')
  async getLowAndOutStocks(@Param('storeId') storeId: string) {
    return this.inventoryService.getLowAndOutStocks(storeId);
  }

  /**
   * Get all batches for a given variant
   */
  @Get('variant/:variantId/batches')
  async getBatchesByVariant(@Param('variantId') variantId: string) {
    return this.inventoryService.getBatchesByVariant(variantId);
  }

  /**
   * Delete a batch manually (optional)
   */
  @Delete('batch/:batchId')
  async deleteBatch(@Param('batchId') batchId: string) {
    return this.inventoryService.deleteBatch(batchId);
  }
}
