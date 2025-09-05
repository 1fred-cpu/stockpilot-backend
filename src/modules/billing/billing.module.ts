import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { SupabaseModule } from "../../lib/supabase.module";
import { HandleErrorService } from "../../helpers/handle-error.helper";
@Module({
    imports: [SupabaseModule],
    controllers: [BillingController],
    providers: [BillingService, HandleErrorService],
    exports: [BillingService]
})
export class BillingModule {}
