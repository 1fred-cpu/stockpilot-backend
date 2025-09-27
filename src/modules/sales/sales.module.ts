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
import { Sale } from "../../entities/sale.entity";
import { Store } from "../../entities/store.entity";
import { SaleItem } from "../../entities/sale-item.entity";
import { InventoryLog } from "../../entities/inventory-log.entity";
import { Customer } from "../../entities/customer.entity";
import { StoreInventory } from "../../entities/store-inventory.entity";
import { StockAlert } from "src/entities/stock-alert.entity";
import { ReceiptPrinterHelper } from "../../helpers/reciept-printer.helper";
import { WhatsappHelper } from "../../helpers/whatsapp.helper";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    imports: [
        SupabaseModule,
        InventoryModule,
        MailModule,
        TypeOrmModule.forFeature([
            Sale,
            Store,
            SaleItem,
            InventoryLog,
            Customer,
            StoreInventory,
            StockAlert
        ])
    ],
    controllers: [SalesController],
    providers: [
        SalesService,
        HandleErrorService,
        EventEmitterHelper,
        SalesEventsListener,
        ReceiptService,
        ReceiptPdfService,
        ReceiptPrinterHelper,
        WhatsappHelper
    ]
})
export class SalesModule {}
