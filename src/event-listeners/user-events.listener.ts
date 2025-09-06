import { OnEvent } from '@nestjs/event-emitter';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { MailService } from '../utils/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';
@Injectable()
export class UserEventsListener {
  private logger = new Logger(UserEventsListener.name);
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly errorHandler: HandleErrorService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  @OnEvent('user.events')
  async handleUserEvents(message: any) {
    try {
      const event = message.value.event;
      const data = message.value.data;

      if (event === 'UserInviteSend') {
        await this.handleUserInviteSendEvent(data);
      }
      if (event === 'UserAssignedRole') {
        await this.handleAssignUserRoleEvent(data);
      }
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'handleUserEvents');
    }
  }

  private async handleUserInviteSendEvent(data: any) {
    try {
      const expireTime = new Date(data.expires_at).getTime();

      const url = `${this.configService.get<string>(
        'FRONTEND_URL',
      )}/register/store?inviteId=${data.id}&role=${data.role}&storeId=${
        data.store_id
      }&businessId=${data.business_id}&expiresAt=${expireTime}`;

      const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Invitation to Join ${data.store_name}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08)">
        <tr>
          <td style="padding:20px 24px;background:#0ea5a4;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;font-weight:700;">You’re invited to join ${data.store_name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;color:#0f172a;">
              Hi there,
            </p>
            <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
              <strong>${data.store_name}</strong> is inviting you to join their team to manage store and inventory at
              <strong>${data.location}</strong>. You’ve been assigned the role of
              <strong>${data.role}</strong>.
            </p>
            <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
              To get started, click the button below to set up your account:
            </p>
            <p style="text-align:center;margin:20px 0;">
              <a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;background:#0ea5a4;color:#ffffff;font-weight:bold;border-radius:6px;text-decoration:none;">
                Accept Invitation
              </a>
            </p>
            <p style="margin:20px 0 12px 0;font-size:13px;line-height:1.5;color:#64748b;">
              This invitation link will expire on <strong>${new Date(data.expires_at).toLocaleString()}</strong>.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">
              If the button above doesn’t work, copy and paste this link into your browser:<br />
              <a href="${url}" style="color:#0ea5a4;word-break:break-all;">${url}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8;">
            © ${new Date().getFullYear()} ${data.business_name || 'StockPilot'} — All rights reserved.
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

      await this.mailService.sendMail(
        data.email,
        `Invitation to join ${data.store_name} store`,
        html,
      );
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'handleUserInviteSendEvent');
    }
  }

  private async handleAssignUserRoleEvent(data: any) {
    try {
      const { store_id, user_id, role, business_id, status, email } = data;

      // Check if user already exists in the store_users table
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('store_users')
        .select('*')
        .eq('store_id', store_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Error fetching store user: ${fetchError.message}`,
        );
      }

      if (!existingUser) {
        // Create new store_user entry if user doesn't exist
        const { error: insertError } = await this.supabase
          .from('store_users')
          .insert([
            {
              store_id,
              business_id,
              user_id,
              role,
              email,
              status,
              assigned_at: new Date().toISOString(),
            },
          ]);

        if (insertError) {
          throw new BadRequestException(
            `Error assigning user to store: ${insertError.message}`,
          );
        }

        this.logger.log(
          `User ${user_id} successfully assigned to store ${store_id} as ${role}`,
        );
      } else {
        // Update role if user already exists
        if (existingUser.role !== role) {
          const { error: updateError } = await this.supabase
            .from('store_users')
            .update({ role, status, updated_at: new Date().toISOString() })
            .eq('store_id', store_id)
            .eq('user_id', user_id);

          if (updateError) {
            throw new BadRequestException(
              `Error updating user role: ${updateError.message}`,
            );
          }

          this.logger.log(
            `User ${user_id} role updated in store ${store_id} to ${role}`,
          );
        } else {
          this.logger.log(
            `User ${user_id} already has role ${role} in store ${store_id}`,
          );
        }
      }
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'handleAssignUserRoleEvent');
    }
  }
}
