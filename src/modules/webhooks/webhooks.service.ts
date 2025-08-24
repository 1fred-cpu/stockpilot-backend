import { Injectable, Inject } from '@nestjs/common';
import Stripe from 'stripe';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../utils/mail/mail.service';
@Injectable()
export class WebhooksService {
  private stripe;
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET')!, {
      apiVersion: '2025-07-30.basil',
    });
  }

  async stripeWebhook(req: Request, res: Response, sig: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        (req as any).rawBody, // must use raw body
        sig,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    switch (event.type) {
      // ✅ User finished checkout
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;

        if (s.mode === 'subscription' && s.subscription && s.customer) {
          const sub = await this.stripe.subscriptions.retrieve(
            s.subscription as string,
          );

          // Find customer by email or metadata
          const storeEmail = s.customer_details?.email ?? null;
          let { data: store } = storeEmail
            ? await this.supabase
                .from('stores')
                .select('id')
                .eq('contactEmail', storeEmail)
                .maybeSingle()
            : { data: null };

          if (!store && sub.metadata?.storeId) {
            const { data } = await this.supabase
              .from('stores')
              .select('id')
              .eq('id', sub.metadata.storeId)
              .maybeSingle();
            store = data;
          }

          if (store) {
            // Ensure stripeCustomerId is stored
            await this.supabase
              .from('stores')
              .update({ stripeCustomerId: s.customer })
              .eq('id', store.id);

            // Link plan by priceId
            const priceId = sub.items.data[0].price.id;
            let { data: plan } = await this.supabase
              .from('plans')
              .select('id')
              .eq('priceId', priceId)
              .maybeSingle();

            // Create subscription record
            await this.supabase.from('subscriptions').upsert({
              stripeSubscriptionId: sub.id,
              storeId: store.id,
              planId: plan?.id,
              status: sub.status,
              currentPeriodStart: new Date(
                (sub as any).current_period_start * 1000,
              ).toISOString(),
              currentPeriodEnd: new Date(
                (sub as any).current_period_end * 1000,
              ).toISOString(),
            });
          }
        }
        break;
      }

      // ✅ Subscription lifecycle
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        await this.supabase
          .from('subscriptions')
          .update({
            status: sub.status,
            currentPeriodStart: new Date(
              (sub as any).current_period_start * 1000,
            ).toISOString(),
            currentPeriodEnd: new Date(
              (sub as any).current_period_end * 1000,
            ).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          })
          .eq('stripeSubscriptionId', sub.id);

        break;
      }

      // ✅ Invoice events
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'invoice.finalized': {
        const inv = event.data.object as Stripe.Invoice;

        // Find store from email
        let { data: store } = inv.customer_email
          ? await this.supabase
              .from('stores')
              .select('id')
              .eq('contactEmail', inv.customer_email)
              .maybeSingle()
          : { data: null };

        await this.supabase.from('invoices').upsert({
          stripeInvoiceId: inv.id,
          storeId: store?.id ?? null,
          total: inv.total ?? 0,
          currency: inv.currency?.toUpperCase() ?? 'USD',
          status: inv.status ?? 'open',
        });
        break;
      }

      // ✅ Trial ending
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;

        // Extract customer ID
        const customerId = subscription.customer as string;

        // Lookup store by stripeCustomerId in Supabase
        const { data: store, error } = await this.supabase
          .from('stores')
          .select('*')
          .eq('stripeCustomerId', customerId)
          .maybeSingle();

        if (store) {
          // 1️⃣ Save notification in DB
          await this.supabase.from('notifications').upsert({
            storeId: store.id,
            title: 'Your trial is ending soon',
            message: `Hi ${store.storeName}, your trial will end on ${new Date(
              subscription.trial_end! * 1000,
            ).toDateString()}. Please add a payment method to continue using StockPilot.`,
            type: 'trial-ending',
          });

          // 2️⃣ Optionally send an emai

          const html = `<html>
                    <body>
                    <h1>Trial Ending Soon</h1>
                    <p>Hello ${
                      store.storeName
                    }, your trial will expire on ${new Date(
                      subscription.trial_end! * 1000,
                    ).toDateString()}. Upgrade now to avoid service
                            interruption.</p>
                    </body>
                    </html>`;
          await this.mailService.sendMail(
            store.contactEmail,
            'You StockPilot trial is ending soon',
            html,
          );
        }

        break;
      }
    }

    return res.json({ received: true });
  }
}
