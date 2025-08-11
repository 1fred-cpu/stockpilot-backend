import { Module } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { SupabaseModule } from "../../../lib/supabase.module";
import { InventoryModule } from "../inventory/inventory.module";
@Module({
    imports: [SupabaseModule,InventoryModule],
    controllers: [SalesController],
    providers: [SalesService]
})
export class SalesModule {}
