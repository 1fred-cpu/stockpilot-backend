import { Module } from "@nestjs/common";
import { BusinessService } from "./business.service";
import { BusinessController } from "./business.controller";
import { SupabaseModule } from "src/lib/supabase.module";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { BusinessEventsListener } from "src/event-listeners/business-events.listener";
import { BillingModule } from "../billing/billing.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { FileUploadService } from "src/utils/upload-file";
@Module({
    imports: [
        SupabaseModule,
        // These modules are used by the business events listener
        BillingModule,
        NotificationsModule
    ],
    controllers: [BusinessController],
    providers: [
        BusinessService,
        HandleErrorService,
        EventEmitterHelper,
        BusinessEventsListener,
        FileUploadService
    ]
})
export class BusinessModule {}
