import {
    Controller,
    Get,
    Param,
    HttpCode,
    HttpStatus,
    Query,
    ParseIntPipe,
    ParseUUIDPipe
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @HttpCode(HttpStatus.OK)
    @Get("kpi/:storeId")
    async getKPIAnalytics(@Param("storeId", ParseUUIDPipe) storeId: string) {
        return await this.analyticsService.getKPIAnalytics(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("sales-trend/last-30-days/:storeId")
    async getSalesTrendLast30Days(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getSalesTrendLast30days(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("top-selling-products/:storeId")
    async getTopSellingProducts(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getTopSellingProducts(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("inventory-status/:storeId")
    async getInventoryStatusByCategory(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getInventoryStatusByCategory(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("sales-latest/:storeId")
    async getLatestSales(@Param("storeId", ParseUUIDPipe) storeId: string) {
        return this.analyticsService.getLatestSales(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("inventory-summary/:storeId")
    async getInventorySummary(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getInventorySummary(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("stock-level/:storeId")
    async getStockLevelsByCategory(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getStockLevelsByCategory(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("inventory-kpi/:storeId")
    async getInventoryKPIAnalytics(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getInventoryKPIAnalytics(storeId);
    }
    @HttpCode(HttpStatus.OK)
    @Get("inventory-distribution/:storeId")
    async getInventoryDistribution(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getInventoryDistribution(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("sale-kpi/:storeId")
    async getSaleKPIAnalytics(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.analyticsService.getSaleKPIAnalytics(storeId);
    }

    @HttpCode(HttpStatus.OK)
    @Get("sale-weekly-trend/:storeId")
    async getWeeklySalesTrend(
        @Param("storeId", ParseUUIDPipe) storeId: string,
        @Query("weeks") weeks: number = 6
    ) {
        return this.analyticsService.getWeeklySalesTrend(
            storeId,
            Number(weeks)
        );
    }
}
