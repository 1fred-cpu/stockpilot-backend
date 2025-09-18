import { Module } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { SupabaseModule } from "src/lib/supabase.module";
import { MailModule } from "src/utils/mail/mail.module";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { InventoryEventsListener } from "../../event-listeners/inventory-events.listener";
import { ProductVariant } from "../../entities/product-variants.entity";
import { StoreInventory } from "../../entities/store-inventory.entity";
import { InventoryLog } from "../../entities/inventory-log.entity";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
    imports: [SupabaseModule, MailModule,
    TypeOrmModule.forFeature([ProductVariant, StoreInventory, InventoryLog])],
    controllers: [InventoryController],
    providers: [InventoryService, HandleErrorService, EventEmitterHelper,
    InventoryEventsListener],
    exports: [InventoryService]
})
export class InventoryModule {}
