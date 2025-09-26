import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { generateReference } from "src/utils/generate-reference";

@Injectable()
export class ReceiptService {
    /**
     * Generate a simple receipt object (can later be exported as PDF/Email).
     */
    async generateReceipt(sale: any) {
        const receiptId = uuidv4();
        const reference = generateReference("SALE");

        // Build receipt data
        const receipt = {
            id: receiptId,
            reference,
            saleId: sale.id,
            storeId: sale.store_id,
            businessId: sale.business_id,
            customerId: sale.customer_id || null,
            totalAmount: sale.total_amount,
            netAmount: sale.net_amount,
            paymentMethod: sale.payment_method,
            createdAt: new Date().toISOString(),
            createdBy: sale.created_by,
            customer: {
                email: sale.customer_email,
                name: sale.customer_name,
                phone: sale.customer_phone
            },
            items: sale.saleItems.map(item => ({
                variantId: item.variant_id,
                productName: item.productVariant.name,
                sku: item.productVariant.sku,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                subtotal: item.quantity * item.unit_price,
                imageUrl: item.productVariant.image_url || null
            }))
        };
        return receipt;
    }
}
