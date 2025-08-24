import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request, Response } from 'express';
@Controller('stripe')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.webhooksService.stripeWebhook(req, res, sig);
  }
}
