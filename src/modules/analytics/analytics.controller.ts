import { Controller, Get,Param } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get("dashboard/:storeId")
    async getDashboardAnalytics(@Param("storeId") storeId: string) {
        return await this.analyticsService.getDashboardAnalytics(storeId);
    }
}
