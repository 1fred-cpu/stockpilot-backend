import nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('GMAIL_USER'), // your Gmail address
        pass: this.configService.get('GMAIL_PASS'), // your Gmail app password
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"<${this.configService.get('GMAIL_USER')}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Error sending email:`, error);
      throw error;
    }
  }
}
