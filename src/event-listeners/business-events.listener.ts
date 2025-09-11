// business.consumer.ts
import { Controller, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SupabaseClient } from '@supabase/supabase-js';
import { BillingService } from 'src/modules/billing/billing.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
@Controller()
export class BusinessEventsListener {
  private readonly logger = new Logger(BusinessEventsListener.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly billingService: BillingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('business.events')
  async handleBusinessEvents(message: any) {
    const event = message.value.event;
    const data = message.value.data;

    if (event === 'BusinessCreated') {
      await this.handleBusinessCreatedEvent(data);
    }
  }

  private async handleBusinessCreatedEvent(data: any) {
    // Billing Service
    await this.billingService.createCustomer(data.id);

    // Notifications
    await this.notificationsService.sendWelcome(data.id, data.name);
  }
}
