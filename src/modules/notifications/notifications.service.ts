// notifications.service.ts
import {
    Injectable,
    Logger,
    Inject,
    BadRequestException
} from "@nestjs/common";
import { MailService } from "../../utils/mail/mail.service";
import { HandleErrorService } from "../../helpers/handle-error.helper";
import { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
        private readonly mailService: MailService,
        private readonly errorHandler: HandleErrorService
    ) {}

    async sendWelcome(businessId: string, businessName: string) {
        try {
            // Get business email
            const { data: business, error: fetchError } = await this.supabase
                .from("businesses")
                .select("email")
                .eq("id", businessId)
                .maybeSingle();
            if (fetchError) {
                throw new BadRequestException(fetchError.message);
            }

            // Send a welcome message
            const html = `<html>
            <body>
            <p>
            Hi, your business ${businessName} created successfully
            </p>
            </body>
            </html>`;
            await this.mailService.sendMail(
                business?.email,
                "Welcome to StockPilot",
                html
            );
        } catch (error) {
            this.errorHandler.handleServiceError(error, "sendWelcome");
        }
    }
}
