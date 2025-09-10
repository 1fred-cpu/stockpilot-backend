import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { generateReference } from 'src/utils/generate-reference';

@Injectable()
export class ReceiptService {
  /**
   * Generate a simple receipt object (can later be exported as PDF/Email).
   */
  async generateReceipt(sale: any) {
    const receiptId = uuidv4();
    const reference = sale.reference || generateReference('SALE');

    // Build receipt data
    const receipt = {
      id: receiptId,
      reference,
      sale_id: sale.id,
      store_id: sale.store_id,
      business_id: sale.business_id,
      customer_id: sale.customer_id || null,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      created_at: new Date().toISOString(),
      created_by: sale.created_by,
      items: sale.saleItems.map((item) => ({
        variant_id: item.variant_id,
        product_name: item.product_variants.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        image_url: item.image_url || null,
      })),
    };
    return receipt;
  }
}
