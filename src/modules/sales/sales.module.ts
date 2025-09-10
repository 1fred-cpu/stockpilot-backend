import { Module } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { SupabaseModule } from "../../lib/supabase.module";
import { InventoryModule } from "../inventory/inventory.module";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { SalesEventsListener } from "src/event-listeners/sales-events.listener";
import { ReceiptService } from "../../helpers/reciept.helper";
import { ReceiptPdfService } from "../../helpers/reciept-pdf.helper";
import { MailModule } from "../../utils/mail/mail.module";
@Module({
    imports: [SupabaseModule, InventoryModule, MailModule],
    controllers: [SalesController],
    providers: [
        SalesService,
        HandleErrorService,
        EventEmitterHelper,
        SalesEventsListener,
        ReceiptService,
        ReceiptPdfService
    ]
})
export class SalesModule {}
