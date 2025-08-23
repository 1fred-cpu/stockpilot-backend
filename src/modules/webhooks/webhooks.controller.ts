import {
    Controller,
    Post,
    Req,
    Res,
    Headers,
    HttpCode,
    HttpStatus,
    Inject
} from "@nestjs/common";
import Stripe from "stripe";
import { WebhooksService } from "./webhooks.service";
@Controller("stripe")
export class WebhookController {
    constructor(

        private readonly webhooksService: WebhooksService
    ) {}

    @Post("webhook")
    @HttpCode(HttpStatus.OK)
    async handleStripeWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers("stripe-signature") sig: string
    ) {
        return this.webhooksService.stripeWebhook(req, res ,
        sig);
    }
}
