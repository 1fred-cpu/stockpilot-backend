import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @HttpCode(HttpStatus.OK)
  @Get('kpi/:storeId')
  async getKPIAnalytics(@Param('storeId') storeId: string) {
    return await this.analyticsService.getKPIAnalytics(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('sales-trend/last-30-days/:storeId')
  async getSalesTrendLast30Days(@Param('storeId') storeId: string) {
    return this.analyticsService.getSalesTrendLast30days(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('top-selling-products/:storeId')
  async getTopSellingProducts(@Param('storeId') storeId: string) {
    return this.analyticsService.getTopSellingProducts(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('inventory-status/:storeId')
  async getInventoryStatusByCategory(@Param('storeId') storeId: string) {
    return this.analyticsService.getInventoryStatusByCategory(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('sales-latest/:storeId')
  async getLatestSales(@Param('storeId') storeId: string) {
    return this.analyticsService.getLatestSales(storeId);
  }
}
