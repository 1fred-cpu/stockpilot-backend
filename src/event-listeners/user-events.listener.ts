import { OnEvent } from "@nestjs/eventEmitter";
import { Injectable } from "@nestjs/common";
import { MailService } from "../utils/mail/mail.service";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class UserEventsListener {
    constructor(
        private readonly mailService: MailService,
        private readonly configService: ConfigService
    ) {}

    @OnEvent("user.events")
    async handleUserEvents(message: any) {
        const event = message.value.event;
        const data = message.value.data;

        if (event === "UserInviteSend") {
            await this.handleUserInviteSendEvent(data);
        }
    }

    private async handleUserInviteSendEvent(data: any) {
        const expireTime = new Date(data.expires_at).getTime();
        const url = `${this.configService.get<string>(
            "FRONTEND_URL"
        )}/register/store?inviteId=${data.id}&&role=${data.role}&&storeId=${
            data.store_id
        }&&businessId=${data.business_id}&&expiresAt=${expireTime}`;

        const html = `
            <html lang="en">
                <body>
                  <h1>Invitation to Join Store</h1>
                  <p>Hi, ${data.store_name} wants you to join their team to
                  manage store and inventory at ${dto.location}. Click
                  the link to setup your account for the store. </p>
                  <a href="${url}">Create account</a>
                </body>
            </html>
        `;
        await this.mailService.sendEmail(
            data.email,
            html,
            `Invitation to join ${dto.store_name} store`
        );
    }
}
