import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('create')
  async createSale(@Body(ValidationPipe) createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  @Get(':saleCode')
  async findSale(@Param('saleCode') saleCode: string) {
    return this.salesService.findSale(saleCode);
  }

  @Get('stores/:storeId')
  async getDailySales(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('date') date?: string,
  ) {
    return this.salesService.getDailySales(storeId, date);
  }

  @Get('analytics')
  async getSalesAnalytics(
    @Query('storeId') storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getAnalytics(storeId, startDate, endDate);
  }
}
