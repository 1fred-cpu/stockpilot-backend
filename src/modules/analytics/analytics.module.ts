import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";
import { SupabaseModule } from "../../lib/supabase.module";
import { HandleErrorService } from "../../helpers/handle-error.helper";
@Module({
    imports: [SupabaseModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, HandleErrorService],
    exports: [AnalyticsService]
})
export class AnalyticsModule {}
