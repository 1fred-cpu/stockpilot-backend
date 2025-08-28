import { Module } from "@nestjs/common";
import { DiscountsService } from "./discounts.service";
import { DiscountsController } from "./discounts.controller";
import { SupabaseModule } from "../../../lib/supabase.module";
@Module({
  imports:[SupabaseModule],
    controllers: [DiscountsController],
    providers: [DiscountsService]
})
export class DiscountsModule {}
