import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('stores/:store_id/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body(ValidationPipe) createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  @Get()
  async getSales(
    @Param('store_id') store_id: string,
    @Query('limit')
    limit?: string,
    @Query('page') page?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('search') search?: string,
    @Query('order_by') order_by?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.salesService.getSales(store_id, {
      limit: Number(limit),
      page: Number(page),
      start_date,
      end_date,
      search,
      order_by,
      order,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(+id, updateSaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }
}
