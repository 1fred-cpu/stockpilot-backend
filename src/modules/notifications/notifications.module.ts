import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { SupabaseModule } from "../../lib/supabase.module";
import { MailModule } from "../../utils/mail/mail.module";
import { HandleErrorService } from "../../helpers/handle-error.helper";
@Module({
    imports: [SupabaseModule, MailModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, HandleErrorService],
    exports: [NotificationsService]
})
export class NotificationsModule {}
