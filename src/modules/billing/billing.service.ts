import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';
import { BusinessService } from '../business/business.service';

@Injectable()
export class BillingService {
  private stripe;
  private logger = new Logger(BillingService.name);
  constructor(
    private readonly configService: ConfigService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly errorHandler: HandleErrorService,

    @Inject(forwardRef(() => BusinessService))
    private readonly businessService: BusinessService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET')!, {
      apiVersion: '2025-07-30.basil',
    });
  }

  // POST /api/billing/subscribe { priceId }  // Stripe Price ID
  async subscribeStore(
    storeId: string,
    plan: 'Starter' | 'Growth' | 'Enterprise' = 'Starter',
  ) {
    try {
      const priceId = await this.getPriceId(plan);

      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      if (fetchError) {
        throw new BadRequestException(`Error fetching store:
          ${fetchError.message}`);
      }
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // Ensure store exists in stripe
      let customerId = store.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: store.contactEmail,
          metadata: { storeId },
        });
        customerId = customer.id;
        const { data: updatedStore, error: updateError } = await this.supabase
          .from('stores')
          .update({
            stripeCustomerId: customerId,
          })
          .eq('id', storeId);

        if (updateError) {
          throw new BadRequestException(`Error updating store:
                ${updateError.message}`);
        }
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/billing/cancel`,
        // tax_id_collection: { enabled: true }, // if you need it
        // automatic_tax: { enabled: true },     // if you use Stripe Tax
      });

      return { url: session.url };
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }

      this.logger.error(`Error subscribing store: ${error.message}`);
      throw new InternalServerErrorException('Failed to subscribe store');
    }
  }

  // POST /api/billing/portal
  async billingPortal(storeId) {
    try {
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      if (fetchError) {
        throw new BadRequestException(`Error fetching store:
          ${fetchError.message}`);
      }
      if (!store) {
        throw new NotFoundException('Store not found');
      }
      if (!store?.stripeCustomerId)
        throw new BadRequestException('Missing customer ID from stripe');

      const portal = await this.stripe.billingPortal.sessions.create({
        customer: store.stripeCustomerId,
        return_url: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/settings/billing`,
      });
      return { url: portal.url };
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }

      this.logger.error(`Error creating billing portal: ${error.message}`);
      throw new InternalServerErrorException('Failed to create billing portal');
    }
  }

  // POST /api/billing/cancel { cancelAtPeriodEnd?: boolean }
  async cancelSubscribe(dto: any) {
    try {
      const { storeId } = dto;
      // 1. Fetch store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Error fetching store: ${fetchError.message}`,
        );
      }
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      const { cancelAtPeriodEnd = true } = dto;

      // 2. Fetch subscription
      const { data: sub, error: subError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('storeId', storeId) // or eq("userId", userId) if you track by user
        .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
        .maybeSingle();

      if (subError) {
        throw new BadRequestException(
          `Error fetching subscription: ${subError.message}`,
        );
      }
      if (!sub) {
        throw new NotFoundException('Subscription not found');
      }

      // 3. Cancel subscription on Stripe
      const updated = await this.stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        { cancel_at_period_end: cancelAtPeriodEnd },
      );

      // 4. Update subscription in Supabase
      const { error: updateError } = await this.supabase
        .from('subscriptions')
        .update({
          cancelAtPeriodEnd: updated.cancel_at_period_end ?? false,
          status: updated.status,
        })
        .eq('id', sub.id);

      if (updateError) {
        throw new BadRequestException(
          `Error updating subscription: ${updateError.message}`,
        );
      }

      return {
        status: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error cancelling subscription: ${error.message}`);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  // POST /api/billing/change-plan { newPriceId }
  async changePlan(storeId: string, plan: 'Starter' | 'Growth' | 'Enterprise') {
    try {
      // 1. Fetch store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Error fetching store: ${fetchError.message}`,
        );
      }
      if (!store) {
        throw new NotFoundException('Store not found');
      }
      const newPriceId = await this.getPriceId(plan);

      // 3. Fetch subscription
      const { data: sub, error: subError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('storeId', storeId) // or eq("userId", userId) if you track by user
        .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
        .maybeSingle();

      if (subError) {
        throw new BadRequestException(
          `Error fetching subscription: ${subError.message}`,
        );
      }
      if (!sub) {
        throw new NotFoundException('Subscription not found');
      }

      const stripeSub = await this.stripe.subscriptions.retrieve(
        sub.stripeSubscriptionId,
      );
      const itemId = stripeSub.items.data[0].id;

      const updated = await this.stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: 'create_prorations',
        },
      );

      return {
        status: updated.status,
        currentPeriodEnd: updated.current_period_end,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error updating subscription: ${error.message}`);
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  async getPriceId(plan: 'Starter' | 'Growth' | 'Enterprise') {
    let priceId;
    switch (plan) {
      case 'Starter': {
        const { data, error } = await this.supabase
          .from('plans')
          .select('priceId')
          .eq('name', 'Starter')
          .maybeSingle();
        if (error) {
          throw new BadRequestException(`Error fetching plan:
                ${error.message}`);
        }

        priceId = data?.priceId;
        break;
      }
      case 'Growth': {
        const { data, error } = await this.supabase
          .from('plans')
          .select('priceId')
          .eq('name', 'Growth')
          .maybeSingle();
        if (error) {
          throw new BadRequestException(`Error fetching plan:
                ${error.message}`);
        }

        priceId = data?.priceId;
        break;
      }
      case 'Enterprise': {
        const { data, error } = await this.supabase
          .from('plans')
          .select('priceId')
          .eq('name', 'Enterprise')
          .maybeSingle();
        if (error) {
          throw new BadRequestException(`Error fetching plan:
                ${error.message}`);
        }

        priceId = data?.priceId;
        break;
      }
      default:
        throw new BadRequestException('Invalid plan');
    }
    return priceId;
  }

  /**
   * Create a Stripe customer when a new business is created.
   */
  async createCustomer(businessId: string) {
    try {
      // Check business exists
      const business = await this.businessService.findBusiness({
        id: businessId,
      });

      // Skip if already has Stripe customer
      if (business.stripe_customer_id) {
        this.logger.log(
          `Stripe customer already exists for business ${businessId}`,
        );
        return business.stripe_customer_id;
      }

      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        email: business.email,
        metadata: {
          businessId,
          email: business.email,
        },
      });

      return customer.id;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createCustomer');
    }
  }
  async subscribeBusiness(
    businessId: string,
    plan: 'Starter' | 'Growth' | 'Enterprise' = 'Starter',
  ) {
    try {
      const priceId = await this.getPriceId(plan);

      const { data: business, error: fetchError } = await this.supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (fetchError) throw new BadRequestException(fetchError.message);
      if (!business) throw new NotFoundException('Business not found');

      const customerId = business.stripe_customer_id;
      if (!customerId) throw new BadRequestException('Stripe customer missing');

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/billing/cancel`,
      });

      return { url: session.url };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'subscribeBusiness');
    }
  }
}
