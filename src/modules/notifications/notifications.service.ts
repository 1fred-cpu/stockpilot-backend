// notifications.service.ts
import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../../utils/mail/mail.service';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly mailService: MailService,
    private readonly errorHandler: HandleErrorService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcome(businessId: string, businessName: string) {
    try {
      // ✅ Fetch business email
      const { data: business, error: fetchError } = await this.supabase
        .from('businesses')
        .select('email')
        .eq('id', businessId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Failed to fetch business email: ${fetchError.message}`,
        );
      }

      if (!business?.email) {
        throw new NotFoundException(
          `No email found for business ID: ${businessId}`,
        );
      }

      // ✅ Build friendly HTML template
      const html = `
      <html lang="en">
        <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <table style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="text-align: center;">
                <h1 style="color: #4CAF50;">🎉 Welcome to StockPilot!</h1>
              </td>
            </tr>
            <tr>
              <td style="font-size: 16px; color: #333;">
                <p>Hi there,</p>
                <p>Your business <strong>${businessName}</strong> has been successfully created on <b>StockPilot</b>.</p>
                <p>We’re excited to help you manage your stores and inventory smarter and faster 🚀.</p>
                <p style="margin-top: 20px;">You can now log in to your dashboard and start exploring the tools we’ve prepared for you.</p>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 30px 0;">
                <a href="${this.configService.get<string>('FRONTEND_URL')}/dashboard" 
                  style="background: #4CAF50; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold;">
                  Go to Dashboard
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #777; text-align: center; padding-top: 20px;">
                <p>Need help? Reply to this email or visit our <a href="${this.configService.get<string>('FRONTEND_URL')}/support">Support Center</a>.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

      // ✅ Send email
      await this.mailService.sendMail(
        business.email,
        '🎉 Welcome to StockPilot',
        html,
      );

      this.logger.log(
        `Welcome email sent to ${business.email} for business ${businessName}`,
      );
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'sendWelcome');
    }
  }
}
