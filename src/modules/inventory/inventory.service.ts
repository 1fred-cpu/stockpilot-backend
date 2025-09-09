import {
  BadRequestException,
  Injectable,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { RestockDto } from './dto/restock.dto';
import { DeductStockDto } from './dto/deduct-stock.dto';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
@Injectable()
export class InventoryService {
  private logger = new Logger(InventoryService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly eventEmitterHelper: EventEmitterHelper,
    private readonly errorHandler: HandleErrorService,
  ) {}

  //   async stockMove(
  //     dto: StockChangeDto,
  //   ): Promise<{ newStock: number; alertCreated: boolean }> {
  //     try {
  //       const {
  //         inventoryId,
  //         change,
  //         type,
  //         reason = null,
  //         referenceId = null,
  //         userId = null,
  //         idempotencyKey,
  //       } = dto;

  //       // --- 1. Idempotency Check ---
  //       if (idempotencyKey) {
  //         const { data: existingMovement, error: idempotencyError } =
  //           await this.supabase
  //             .from('stock_movements')
  //             .select('id')
  //             .eq('idempotencyKey', idempotencyKey)
  //             .maybeSingle();

  //         if (idempotencyError) {
  //           throw new BadRequestException(
  //             `Error checking idempotency: ${idempotencyError.message}`,
  //           );
  //         }

  //         if (existingMovement) {
  //           const { data: inv, error: invError } = await this.supabase
  //             .from('inventories')
  //             .select('stock')
  //             .eq('id', inventoryId)
  //             .maybeSingle();

  //           if (invError) throw new BadRequestException(invError.message);
  //           return { newStock: inv.stock, alertCreated: false };
  //         }
  //       }

  //       // --- 2. Fetch Inventory Row with Lock ---
  //       const { data: inventory, error: invFetchError } = await this.supabase
  //         .from('inventories')
  //         .select('stock, lowStockThreshold, lastAlertedAt, storeId,totalStock')
  //         .eq('id', inventoryId)
  //         .maybeSingle();

  //       if (invFetchError) throw new BadRequestException(invFetchError.message);
  //       if (!inventory)
  //         throw new NotFoundException(
  //           `Inventory with id ${inventoryId} not found`,
  //         );

  //       let {
  //         stock,
  //         lowStockThreshold: threshold,
  //         lastAlertedAt,
  //         storeId,
  //         totalStock,
  //       } = inventory;

  //       let tStock = totalStock;
  //       // --- 3. Prevent Negative Stock ---
  //       if (stock + change < 0) {
  //         throw new BadRequestException(
  //           `Insufficient stock for inventory ${inventoryId}`,
  //         );
  //       }

  //       if (change > 0) {
  //         tStock = totalStock + change;
  //       }

  //       // --- 4. Update Stock ---
  //       const newStock = stock + change;
  //       const { error: updateError } = await this.supabase
  //         .from('inventories')
  //         .update({
  //           stock: newStock,
  //           totalStock: tStock,
  //           updatedAt: new Date().toISOString(),
  //         })
  //         .eq('id', inventoryId);

  //       if (updateError) throw new BadRequestException(updateError.message);

  //       // --- 5. Insert Stock Movement ---
  //       const { error: movementError } = await this.supabase
  //         .from('stock_movements')
  //         .upsert({
  //           inventoryId,
  //           change,
  //           type,
  //           storeId,
  //           reason,
  //           referenceId,
  //           idempotencyKey,
  //           createdBy: userId,
  //           createdAt: new Date().toISOString(),
  //         });

  //       if (movementError) throw new BadRequestException(movementError.message);

  //       // --- 6. Low Stock Alert Logic ---
  //       let alertCreated = false;
  //       if (newStock <= threshold) {
  //         const { error: alertError } = await this.supabase
  //           .from('stock_alerts')
  //           .upsert({
  //             inventoryId,
  //             stockAtTrigger: newStock,
  //             threshold,
  //             storeId,
  //             status: 'pending',
  //             triggeredAt: new Date().toISOString(),
  //           });

  //         if (alertError) throw new BadRequestException(alertError.message);

  //         // Update lastAlertedAt
  //         await this.supabase
  //           .from('inventories')
  //           .update({ lastAlertedAt: new Date().toISOString() })
  //           .eq('id', inventoryId);

  //         alertCreated = true;
  //       }

  //       if (alertCreated) {
  //         const { data, error } = await this.supabase
  //           .from('inventories')
  //           .select(`productId, products(storeId,stores(contactEmail))`)
  //           .eq('id', inventoryId)
  //           .maybeSingle();

  //         if (error) {
  //           throw new BadRequestException(error.message);
  //         }

  //         const { data: product, fetcherror } = await this.supabase
  //           .from('products')
  //           .select('name')
  //           .eq('inventoryId', inventoryId)
  //           .maybeSingle();

  //         if (fetcherror) {
  //           throw new BadRequestException(error.message);
  //         }

  //         const htmlContent = `
  // <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  //   <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
  //     <div style="background-color: #2a7ade; padding: 20px; text-align: center; color: #fff;">
  //       <img src="https://yourdomain.com/logo.png" alt="Company Logo" style="max-width: 60px; margin-bottom: 10px;" />
  //       <h1 style="margin: 0; font-size: 24px;">Stock Alert</h1>
  //     </div>
  //     <div style="padding: 20px; color: #333;">
  //       <h2 style="color: #2a7ade; margin-top: 0;">Inventory Threshold Reached</h2>
  //       <p>
  //         We’ve detected that the stock level for ${
  //           product.name
  //         } has reached its alert threshold.
  //       </p>
  //       <p>
  //         Please review and take action to prevent potential stockouts.
  //       </p>
  //       <a href="https://yourapp.com/inventory/${inventoryId}"
  //          style="display: inline-block; padding: 10px 20px; background-color: #2a7ade; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 15px;">
  //         View Inventory
  //       </a>
  //     </div>
  //     <div style="padding: 15px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee;">
  //       &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
  //     </div>
  //   </div>
  // </div>
  // `;

  //         const storeEmail = data.products.stores.contactEmail;
  //         await this.mailService.sendMail(storeEmail, 'Stock Alert', htmlContent);
  //       }

  //       return { newStock, alertCreated };
  //     } catch (error) {
  //       if (error instanceof BadRequestException || NotFoundException)
  //         throw error;

  //       this.logger.error('Error processing stock move', error);
  //       throw new InternalServerErrorException(
  //         'An error occurred while processing the stock move',
  //         error.message,
  //       );
  //     }
  //   }

  //   async restockMove(restockChangeDto: RestockChangeDto) {
  //     try {
  //       if (!isValidUUID(restockChangeDto.storeId)) {
  //         throw new BadRequestException('Invalid format of storeId');
  //       }

  //       const { data: existsStore, error: existsStoreError } = await this.supabase
  //         .from('stores')
  //         .select('id')
  //         .eq('id', restockChangeDto.storeId)
  //         .maybeSingle();
  //       if (existsStoreError) {
  //         throw new BadRequestException(`Error checking store existence:
  //               ${existsStoreError.message}`);
  //       }

  //       if (!existsStore) {
  //         throw new NotFoundException('Store not found');
  //       }

  //       for (const stockChange of restockChangeDto.changes) {
  //         await this.stockMove({
  //           inventoryId: stockChange.inventoryId,
  //           change: stockChange.change,
  //           type: stockChange.type,
  //           reason: stockChange.reason || undefined,
  //           referenceId: stockChange.referenceId || undefined,
  //           userId: stockChange.userId || undefined,
  //           idempotencyKey: stockChange.idempotencyKey,
  //         });
  //       }
  //       return { message: 'Restocked products successfully' };
  //     } catch (error) {
  //       if (error instanceof BadRequestException || NotFoundException)
  //         throw error;

  //       this.logger.error('Error processing restock move', error);
  //       throw new InternalServerErrorException(
  //         'An error occurred while processing the restock move',
  //         error.message,
  //       );
  //     }
  //   }

  /**
   * Public method: Restock a variant
   */
  async restockVariants(payload: RestockDto, idempotencyKey?: string) {
    try {
      const results: any[] = [];

      for (const variant of payload.variants) {
        const key = idempotencyKey || uuidv4();

        // 🔹 Check if already processed (idempotency)
        const { data: existingLog, error: logError } = await this.supabase
          .from('inventory_logs')
          .select('*')
          .eq('idempotency_key', key)
          .eq('variant_id', variant.variant_id)
          .eq('store_id', payload.store_id)
          .maybeSingle();

        if (logError) throw new BadRequestException(logError.message);

        if (existingLog) {
          results.push({
            message: 'Duplicate request ignored (idempotent)',
            variant_id: existingLog.variant_id,
            restocked: existingLog.change,
            reason: existingLog.reason,
            created_by: existingLog.created_by,
            created_at: existingLog.created_at,
            idempotency_key: key,
          });
          continue;
        }

        // 🔹 Validate variant exists
        const variantData = await this.getVariant(variant.variant_id);
        if (!variantData) {
          throw new NotFoundException(
            `Variant ${variant.variant_id} not found`,
          );
        }

        // 🔹 Get or create store_inventory
        let inventory = await this.getStoreInventory(
          payload.store_id,
          variant.variant_id,
        );

        // 🔹 Handle batch if expiry tracking is enabled
        if (variantData.tracks_expiry && variant.expires_at) {
          await this.createInventoryBatch(variant, inventory.id);
        }

        // 🔹 Update store inventory quantities
        await this.updateStoreInventory(inventory, variant.quantity);

        // 🔹 Insert inventory log
        const { error: insertLogError } = await this.supabase
          .from('inventory_logs')
          .insert({
            id: uuidv4(),
            change: variant.quantity,
            type: 'restock',
            reason: variant.reason || null,
            inventory_id: inventory.id,
            reference: variant.reference || null,
            idempotency_key: key,
            created_by: payload.restocked_by,
            store_id: payload.store_id,
            variant_id: variant.variant_id,
            created_at: new Date().toISOString(),
          });

        if (insertLogError)
          throw new BadRequestException(insertLogError.message);

        results.push({
          message: 'Variant restocked successfully',
          variant_id: variant.variant_id,
          inventory_id: inventory.id,
          quantity: variant.quantity,
          store_id: payload.store_id,
          restocked_by: payload.restocked_by,
          idempotency_key: key,
        });
      }

      // 🔹 Emit one event with all variants
      await this.eventEmitterHelper.emitEvent(
        'inventory.events',
        payload.store_id,
        'InventoryRestocked',
        {
          store_id: payload.store_id,
          restocked_by: payload.restocked_by,
          variants: results,
        },
      );

      return { results };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'restockVariants');
    }
  }

  async deductStock(dto: DeductStockDto, idempotencyKey?: string) {
    try {
      // 1. Default idempotency key if not provided
      const key = idempotencyKey || uuidv4();

      // 2. Check if key already used
      const { data: existingLogs, error: logError } = await this.supabase
        .from('inventory_logs')
        .select('*')
        .eq('idempotency_key', key);

      if (logError) throw new BadRequestException(logError.message);
      if (existingLogs && existingLogs.length > 0) {
        // Already processed — return results
        return {
          message: 'Duplicate request ignored (idempotent)',
          deductions: existingLogs.map((log) => ({
            variant_id: log.variant_id,
            deducted: log.change,
            reason: log.reason,
            created_at: log.created_at,
          })),
          idempotency_key: key,
        };
      }

      const results: any[] = [];

      for (const deduction of dto.deductions) {
        // Step 1: Fetch inventory
        const inventory = await this.getStoreInventory(
          deduction.store_id,
          deduction.variant_id,
        );
        if (!inventory) {
          throw new NotFoundException(
            `Inventory not found for variant ${deduction.variant_id}`,
          );
        }

        // Step 2: Check stock availability
        if (inventory.quantity < deduction.quantity) {
          throw new BadRequestException(
            `Not enough stock to deduct for variant ${deduction.variant_id}`,
          );
        }

        const newQuantity = inventory.quantity - deduction.quantity;

        // Step 3: Update stock
        const { data: updatedInventory, error: updateError } =
          await this.supabase
            .from('store_inventory')
            .update({ quantity: newQuantity })
            .eq('id', inventory.id)
            .select()
            .maybeSingle();

        if (updateError) throw new BadRequestException(updateError.message);

        // Step 4: Log deduction
        const { error: logInsertError } = await this.supabase
          .from('inventory_logs')
          .insert({
            id: uuidv4(),
            idempotency_key: key,
            inventory_id: updatedInventory.id,
            change: deduction.quantity,
            type: 'deduct',
            reference: deduction.reference || null,
            created_by: deduction.created_by || null,
            store_id: deduction.store_id,
            variant_id: deduction.variant_id,
            reason: deduction.reason,
            created_at: new Date().toISOString(),
          });

        if (logInsertError) {
          throw new ConflictException(
            `Deduction applied but failed to log idempotency for variant ${deduction.variant_id}`,
          );
        }

        // Step 5: Low stock alert
        if (updatedInventory.quantity <= updatedInventory.low_stock_threshold) {
          await this.supabase.from('stock_alerts').insert({
            id: uuidv4(),
            threshold: updatedInventory.low_stock_threshold,
            status: 'low stock',
            triggered_at: new Date().toISOString(),
            inventory_id: updatedInventory.id,
            stock_at_trigger: updatedInventory.quantity,
            store_id: deduction.store_id,
            created_at: new Date().toISOString(),
          });

          await this.eventEmitterHelper.emitEvent(
            'inventory.events',
            deduction.store_id,
            'InventoryStockAlert',
            {
              store_id: deduction.store_id,
              inventory_id: updatedInventory.id,
            },
          );
        }

        results.push({
          variant_id: deduction.variant_id,
          deducted: deduction.quantity,
          remaining: newQuantity,
        });
      }

      // Step 6: Emit one event for all deductions
      await this.eventEmitterHelper.emitEvent(
        'inventory.events',
        dto.deductions[0].store_id, // assuming all deductions are same store
        'InventoryDeducted',
        {
          idempotency_key: key,
          deductions: results,
          created_by: dto.deductions[0].created_by,
        },
      );

      return {
        message: 'Stock deducted successfully',
        deductions: results,
        idempotency_key: key,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deductStock');
    }
  }

  /**
   * Helper: Get variant
   */
  private async getVariant(variantId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('id, product_id,')
      .eq('id', variantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Helper: Get store inventory
   */
  private async getStoreInventory(storeId: string, variantId: string) {
    const { data, error } = await this.supabase
      .from('store_inventory')
      .select('*')
      .eq('store_id', storeId)
      .eq('variant_id', variantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Helper: Create store inventory if not exists
   */
  private async createStoreInventory(storeId: string, variantId: string) {
    const { data, error } = await this.supabase
      .from('store_inventory')
      .insert({
        store_id: storeId,
        variant_id: variantId,
        quantity: 0,
        low_stock_threshold: 0,
        reserved: 0,
      })
      .select('*')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Helper: Create inventory batch
   */
  private async createInventoryBatch(payload: any, inventoryId: string) {
    const { error } = await this.supabase
      .from('store_inventory_batches')
      .insert({
        store_id: payload.store_id,
        variant_id: payload.variant_id,
        inventory_id: inventoryId,
        quantity_added: payload.quantity,
        remaining_quantity: payload.quantity,
        expires_at: payload.expires_at ?? null,
        cost_price: payload.cost_price ?? null,
        restocked_by: payload.restocked_by,
      });

    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Helper: Update store inventory
   */
  private async updateStoreInventory(inventory: any, quantity: number) {
    const { error } = await this.supabase
      .from('store_inventory')
      .update({
        quantity: inventory.quantity + quantity,
      }) // if you have pg function
      .eq('id', inventory.id);

    if (error) throw new BadRequestException(error.message);
  }
}
