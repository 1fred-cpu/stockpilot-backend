import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { SupabaseModule } from "../../../lib/supabase.module";
import { MailModule } from "../../../utils/mail/mail.module";
@Module({
    imports: [SupabaseModule, MailModule],
    controllers: [WebhooksController],
    providers: [WebhooksService]
})
export class WebhooksModule {}
