import {
    BadRequestException,
    Injectable,
    Inject,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from "@nestjs/common";
import { StockChangeDto } from "./dto/stock-change.dto";
import { MailService } from "utils/mail/mail.service";

@Injectable()
export class InventoryService {
    private logger = new Logger(InventoryService.name);
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any,
        private readonly mailService: MailService
    ) {}

    async stockMove(
        dto: StockChangeDto
    ): Promise<{ newStock: number; alertCreated: boolean }> {
        try {
            const {
                inventory_id,
                change,
                type,
                reason = null,
                reference_id = null,
                userId = null,
                idempotency_key
            } = dto;

            // --- 1. Idempotency Check ---
            if (idempotency_key) {
                const { data: existingMovement, error: idempotencyError } =
                    await this.supabase
                        .from("stock movements")
                        .select("id")
                        .eq("idempotency_key", idempotency_key)
                        .maybeSingle();

                if (idempotencyError) {
                    throw new BadRequestException(
                        `Error checking idempotency: ${idempotencyError.message}`
                    );
                }

                if (existingMovement) {
                    const { data: inv, error: invError } = await this.supabase
                        .from("inventories")
                        .select("stock")
                        .eq("id", inventory_id)
                        .maybeSingle();

                    if (invError)
                        throw new BadRequestException(invError.message);
                    return { newStock: inv.stock, alertCreated: false };
                }
            }

            // --- 2. Fetch Inventory Row with Lock ---
            const { data: inventory, error: invFetchError } =
                await this.supabase
                    .from("inventories")
                    .select("stock, low_stock_threshold, last_alerted_at")
                    .eq("id", inventory_id)
                    .maybeSingle();

            if (invFetchError)
                throw new BadRequestException(invFetchError.message);
            if (!inventory)
                throw new NotFoundException(
                    `Inventory with id ${inventory_id} not found`
                );

            let {
                stock,
                low_stock_threshold: threshold,
                last_alerted_at: lastAlertedAt
            } = inventory;

            // --- 3. Prevent Negative Stock ---
            if (stock + change < 0) {
                throw new BadRequestException(
                    `Insufficient stock for inventory ${inventory_id}`
                );
            }

            // --- 4. Update Stock ---
            const newStock = stock + change;
            const { error: updateError } = await this.supabase
                .from("inventories")
                .update({
                    stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq("id", inventory_id);

            if (updateError) throw new BadRequestException(updateError.message);

            // --- 5. Insert Stock Movement ---
            const { error: movementError } = await this.supabase
                .from("stock movements")
                .insert({
                    inventory_id: inventory_id,
                    change,
                    type,
                    reason,
                    reference_id: reference_id,
                    idempotency_key: idempotency_key,
                    created_by: userId,
                    created_at: new Date().toISOString()
                });

            if (movementError)
                throw new BadRequestException(movementError.message);

            // --- 6. Low Stock Alert Logic ---
            let alertCreated = false;
            if (newStock <= threshold) {
                const { error: alertError } = await this.supabase
                    .from("stock alerts")
                    .insert({
                        inventory_id: inventory_id,
                        stock_at_trigger: newStock,
                        threshold,
                        status: "pending",
                        triggered_at: new Date().toISOString()
                    });

                if (alertError)
                    throw new BadRequestException(alertError.message);

                // Update last_alerted_at
                await this.supabase
                    .from("inventories")
                    .update({ last_alerted_at: new Date().toISOString() })
                    .eq("id", inventory_id);

                alertCreated = true;
            }

            if (alertCreated) {
                const { data, error } = await this.supabase
                    .from("inventories")
                    .select(
                        `product_id, products(store_id,stores(contact_email))`
                    )
                    .eq("id", inventory_id)
                    .maybeSingle();

                if (error) {
                    throw new BadRequestException(error.message);
                }

                const { data: product, fetcherror } = await this.supabase
                    .from("products")
                    .select("name")
                    .eq("inventory_id", inventory_id)
                    .maybeSingle();

                if (fetcherror) {
                    throw new BadRequestException(error.message);
                }

                const htmlContent = `
<div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    <div style="background-color: #2a7ade; padding: 20px; text-align: center; color: #fff;">
      <img src="https://yourdomain.com/logo.png" alt="Company Logo" style="max-width: 60px; margin-bottom: 10px;" />
      <h1 style="margin: 0; font-size: 24px;">Stock Alert</h1>
    </div>
    <div style="padding: 20px; color: #333;">
      <h2 style="color: #2a7ade; margin-top: 0;">Inventory Threshold Reached</h2>
      <p>
        We’ve detected that the stock level for ${
            product.name
        } has reached its alert threshold.
      </p>
      <p>
        Please review and take action to prevent potential stockouts.
      </p>
      <a href="https://yourapp.com/inventory/${inventory_id}" 
         style="display: inline-block; padding: 10px 20px; background-color: #2a7ade; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 15px;">
        View Inventory
      </a>
    </div>
    <div style="padding: 15px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee;">
      &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
    </div>
  </div>
</div>
`;

                const storeEmail = data.products.stores.contact_email;
                await this.mailService.sendMail(
                    storeEmail,
                    "Stock Alert",
                    htmlContent
                );
            }

            return { newStock, alertCreated };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            else if (error instanceof NotFoundException) throw error;
            this.logger.error("Error processing stock move", error);
            throw new InternalServerErrorException(
                "An error occurred while processing the stock move",
                error.message
            );
        }
    }
}
