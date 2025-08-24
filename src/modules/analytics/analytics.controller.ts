import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpi/:storeId')
  async getKPIAnalytics(@Param('storeId') storeId: string) {
    return await this.analyticsService.getKPIAnalytics(storeId);
  }
}
