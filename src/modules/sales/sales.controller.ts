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
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

//   @Post()
//   async createSale(@Body(ValidationPipe) createSaleDto: CreateSaleDto) {
//     return this.salesService.createSale(createSaleDto);
//   }

  @Get()
  async getSales(
    @Query('storeId') storeId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.salesService.getSales(storeId, {
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      startDate,
      endDate,
      search,
      orderBy,
      order,
    });
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