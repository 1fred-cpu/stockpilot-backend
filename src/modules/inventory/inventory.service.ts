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
                inventoryId,
                change,

                type,
                reason = null,
                referenceId = null,
                userId = null,
                idempotencyKey
            } = dto;

            // --- 1. Idempotency Check ---
            if (idempotencyKey) {
                const { data: existingMovement, error: idempotencyError } =
                    await this.supabase
                        .from("stock_movements")
                        .select("id")
                        .eq("idempotencyKey", idempotencyKey)
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
                        .eq("id", inventoryId)
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
                    .select("stock, lowStockThreshold, lastAlertedAt, storeId")
                    .eq("id", inventoryId)
                    .maybeSingle();

            if (invFetchError)
                throw new BadRequestException(invFetchError.message);
            if (!inventory)
                throw new NotFoundException(
                    `Inventory with id ${inventoryId} not found`
                );

            let {
                stock,
                lowStockThreshold: threshold,
                lastAlertedAt,
                storeId
            } = inventory;

            // --- 3. Prevent Negative Stock ---
            if (stock + change < 0) {
                throw new BadRequestException(
                    `Insufficient stock for inventory ${inventoryId}`
                );
            }

            // --- 4. Update Stock ---
            const newStock = stock + change;
            const { error: updateError } = await this.supabase
                .from("inventories")
                .update({
                    stock: newStock,
                    updatedAt: new Date().toISOString()
                })
                .eq("id", inventoryId);

            if (updateError) throw new BadRequestException(updateError.message);

            // --- 5. Insert Stock Movement ---
            const { error: movementError } = await this.supabase
                .from("stock_movements")
                .upsert({
                    inventoryId,
                    change,
                    type,
                    storeId,
                    reason,
                    referenceId,
                    idempotencyKey,
                    createdBy: userId,
                    createdAt: new Date().toISOString()
                });

            if (movementError)
                throw new BadRequestException(movementError.message);

            // --- 6. Low Stock Alert Logic ---
            let alertCreated = false;
            if (newStock <= threshold) {
                const { error: alertError } = await this.supabase
                    .from("stock_alerts")
                    .upsert({
                        inventoryId,
                        stockAtTrigger: newStock,
                        threshold,
                        storeId,
                        status: "pending",
                        triggeredAt: new Date().toISOString()
                    });

                if (alertError)
                    throw new BadRequestException(alertError.message);

                // Update lastAlertedAt
                await this.supabase
                    .from("inventories")
                    .update({ lastAlertedAt: new Date().toISOString() })
                    .eq("id", inventoryId);

                alertCreated = true;
            }

            if (alertCreated) {
                const { data, error } = await this.supabase
                    .from("inventories")
                    .select(`productId, products(storeId,stores(contactEmail))`)
                    .eq("id", inventoryId)
                    .maybeSingle();

                if (error) {
                    throw new BadRequestException(error.message);
                }

                const { data: product, fetcherror } = await this.supabase
                    .from("products")
                    .select("name")
                    .eq("inventoryId", inventoryId)
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
      <a href="https://yourapp.com/inventory/${inventoryId}" 
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

                const storeEmail = data.products.stores.contactEmail;
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
