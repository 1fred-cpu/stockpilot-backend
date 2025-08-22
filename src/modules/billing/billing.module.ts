import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { SupabaseModule } from "../../../lib/supabase.module";
@Module({
    imports: [SupabaseModule],
    controllers: [BillingController],
    providers: [BillingService]
})
export class BillingModule {}
