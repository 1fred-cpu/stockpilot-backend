import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { MailService } from 'src/utils/mail/mail.service';
import { OnEvent } from '@nestjs/event-emitter';
import { HandleErrorService } from 'src/helpers/handle-error.helper';

@Injectable()
export class InventoryEventsListener {
  private logger = new Logger(InventoryEventsListener.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly mailService: MailService,
    private readonly errorHandler: HandleErrorService,
  ) {}

  @OnEvent('inventory.events')
  async handleInventoryEvents(message: any) {
    const event = message.value.event;
    const data = message.value.data;

    try {
      if (event === 'InventoryRestocked') {
        await this.handleInventoryRestockEvent(data);
      }
      if (event === 'InventoryStockAlert') {
        await this.handleInventoryStockAlertEvent(data);
      }
      if (event === 'InventoryDeducted') {
        await this.handleInventoryDeductedEvent;
      }
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'handleInventoryEvents');
    }
  }

  /** Events listener helpers */
  private async handleInventoryRestockEvent(data: any) {
    try {
      const { store_id, restocked_by, variants } = data;

      // 1. Get store info
      const { data: store, error: storeError } = await this.supabase
        .from('stores')
        .select('id, name')
        .eq('id', store_id)
        .maybeSingle();
      if (storeError) throw new BadRequestException(storeError.message);

      // 2. Get user info
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, name, email,business(email)')
        .eq('id', restocked_by)
        .maybeSingle();
      if (userError) throw new BadRequestException(userError.message);

      const ownerEmail = user?.business[0].email;

      // 3. Fetch variant details (product + variant + image)
      const variantIds = variants.map((v: any) => v.variant_id);
      const { data: variantDetails, error: variantError } = await this.supabase
        .from('product_variants')
        .select(
          `
        id,
        name,
        image_url,
        product:products (
          id,
          name
        )
      `,
        )
        .in('id', variantIds);

      if (variantError) throw new BadRequestException(variantError.message);

      // 4. Map variants with their details
      const variantRows = variants
        .map((v: any) => {
          const detail = variantDetails?.find(
            (d: any) => d.id === v.variant_id,
          );
          return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">
              <img src="${detail?.image_url || ''}" alt="variant image" style="max-width:50px; max-height:50px;"/>
            </td>
            <td style="padding:8px;border:1px solid #ddd;">
              <strong>${detail?.product[0].name || 'Unknown Product'}</strong><br/>
              ${detail?.name || 'Unknown Variant'}
            </td>
            <td style="padding:8px;border:1px solid #ddd; text-align:center;">
              ${v.quantity}
            </td>
          </tr>
        `;
        })
        .join('');

      // 5. Build email HTML
      const subject = `Inventory Restocked for ${store?.name || 'Store'}`;
      const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color:#2c3e50;">Inventory Restocked</h2>
        <p>
          The following variants have been restocked in 
          <strong>${store?.name || store_id}</strong>:
        </p>
        <table style="border-collapse:collapse; width:100%; margin-top:10px;">
          <thead>
            <tr style="background:#f4f4f4;">
              <th style="padding:8px;border:1px solid #ddd;">Image</th>
              <th style="padding:8px;border:1px solid #ddd;">Product / Variant</th>
              <th style="padding:8px;border:1px solid #ddd;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${variantRows}
          </tbody>
        </table>
        <p style="margin-top:20px;">
          <strong>Restocked by:</strong> ${user?.name || restocked_by} 
          (${user?.email || 'No email found'})<br/>
          <strong>Date:</strong> ${new Date().toLocaleString()}
        </p>
        <hr/>
        <p style="font-size:12px; color:#777;">
          This is an automated message from your Inventory System.
        </p>
      </div>
    `;

      // 6. Send email
      await this.mailService.sendMail(ownerEmail, subject, html);
    } catch (error) {
      this.errorHandler.handleServiceError(
        error,
        'handleInventoryRestockEvent',
      );
    }
  }
  /**
   * Fetch product + variant details
   */
  private async getProductVariantDetails(variantId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select(
        `
        id,
        name,
        image_url,
        products (
          id,
          name
        )
      `,
      )
      .eq('id', variantId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch product details: ${error.message}`);
      return null;
    }

    return data
      ? {
          product_name: data.products[0].name || 'Unknown Product',
          variant_name: data.name || 'Default Variant',
          image_url: data.image_url || null,
        }
      : null;
  }

  /**
   * InventoryStockAlert listener
   */
  async handleInventoryStockAlertEvent(payload: any) {
    try {
      this.logger.log(
        `Stock alert triggered for variant ${payload.variant_id}`,
      );

      const details = await this.getProductVariantDetails(payload.variant_id);

      const html = `
        <h2>⚠️ Low Stock Alert</h2>
        <p><strong>Product:</strong> ${details?.product_name}</p>
        <p><strong>Variant:</strong> ${details?.variant_name}</p>
        ${
          details?.image_url
            ? `<img src="${details.image_url}" alt="Variant Image" width="120"/>`
            : ''
        }
        <p><strong>Store:</strong> ${payload.store_name || payload.store_id}</p>
        <p><strong>Current Stock:</strong> ${payload.stock_at_trigger}</p>
        <p><strong>Threshold:</strong> ${payload.threshold}</p>
        <p>Status: <strong>Low stock</strong></p>
        <p>Triggered At: ${new Date(payload.triggered_at).toLocaleString()}</p>
      `;

      await this.mailService.sendMail(
        payload.ownerEmail,
        `Low Stock Alert - ${details?.product_name} (${details?.variant_name})`,
        html,
      );
    } catch (error) {
      this.errorHandler.handleServiceError(
        error,
        'handleInventoryStockAlertEvent',
      );
    }
  }
  /**
   * InventoryDeducted listener
   */
  async handleInventoryDeductedEvent(payload: any) {
    try {
      this.logger.log(
        `Stock deducted event received with key ${payload.idempotency_key}`,
      );

      // Fetch details for each variant in deductions
      const enriched = await Promise.all(
        payload.deductions.map(async (d) => {
          const details = await this.getProductVariantDetails(d.variant_id);
          return {
            ...d,
            product_name: details?.product_name,
            variant_name: details?.variant_name,
            image_url: details?.image_url,
          };
        }),
      );

      const html = `
        <h2>📦 Stock Deduction Summary</h2>
        <p><strong>Performed By:</strong> ${payload.created_by || 'System'}</p>
        <p><strong>Idempotency Key:</strong> ${payload.idempotency_key}</p>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; margin-top: 12px; width:100%;">
          <thead>
            <tr>
              <th>Image</th>
              <th>Product</th>
              <th>Variant</th>
              <th>Deducted</th>
              <th>Remaining</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${enriched
              .map(
                (d) => `
              <tr>
                <td>${
                  d.image_url ? `<img src="${d.image_url}" width="60"/>` : 'N/A'
                }</td>
                <td>${d.product_name}</td>
                <td>${d.variant_name}</td>
                <td>${d.deducted}</td>
                <td>${d.remaining}</td>
                <td>${d.reason || '-'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <p style="margin-top: 16px;">Event Time: ${new Date().toLocaleString()}</p>
      `;

      await this.mailService.sendMail(
        payload.ownerEmail,
        `Stock Deducted - ${enriched.length} items`,
        html,
      );
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'handleInventoryDeducted');
    }
  }
}
