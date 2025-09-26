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
import { ProductVariant } from '../../entities/product-variant.entity';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class InventoryService {
  private logger = new Logger(InventoryService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly eventEmitterHelper: EventEmitterHelper,
    private readonly errorHandler: HandleErrorService,
    private readonly dataSource: DataSource,
    @InjectRepository(StoreInventory)
    private readonly inventoryRepo: Repository<StoreInventory>,
  ) {}

  /**
   * Public method: Restock a variant
   */
  async restockVariants(payload: RestockDto) {
    try {
      return await this.dataSource.transaction(async (manager: any) => {
        const results: any[] = [];
        const idempotencyKey = payload.idempotencyKey;

        for (const variant of payload.variants) {
          const key = idempotencyKey || uuidv4();

          // 🔹 Check if already processed (idempotency)
          const existingLog = await manager
            .getRepository(InventoryLog)
            .findOne({
              where: {
                idempotency_key: key,
                variant_id: variant.variantId,
                store_id: payload.storeId,
              },
            });

          if (existingLog) {
            results.push({
              message: 'Duplicate request ignored (idempotent)',
              variantId: existingLog.variant_id,
              restocked: existingLog.change,
              reason: existingLog.reason,
              createdBy: existingLog.created_by,
              createdAt: existingLog.created_at,
              idempotencyKey: key,
            });
            continue;
          }

          // 🔹 Validate variant exists
          const variantData = await manager
            .getRepository(ProductVariant)
            .findOne({
              where: { id: variant.variantId },
              relations: ['product'],
            });

          if (!variantData) {
            throw new NotFoundException(
              `Variant ${variant.variantId} not found`,
            );
          }

          // 🔹 Get or create store_inventory
          const inventory = (await manager
            .getRepository(StoreInventory)
            .findOne({
              where: {
                store_id: payload.storeId,
                variant_id: variant.variantId,
              },
            })) as StoreInventory;

          // 🔹 Handle batch if expiry tracking is enabledf
          //                 if (variantData.tracks_expiry && variant.expires_at) {
          //                     const batch = manager.getRepository(InventoryBatch).create({
          //                         id: uuidv4(),
          //                         inventory_id: inventory.id,
          //                         quantity: variant.quantity,
          //                         expires_at: variant.expires_at
          //                     });
          //                     await manager.getRepository(InventoryBatch).save(batch);
          //                 }
          //
          // 🔹 Update store inventory quantities
          inventory.quantity += variant.quantity;
          inventory.total_quantity += variant.quantity;
          await manager.getRepository(StoreInventory).save(inventory);

          // 🔹 Insert inventory log
          const log = manager.getRepository(InventoryLog).create({
            id: uuidv4(),
            change: variant.quantity,
            type: 'restock',
            reason: variant.reason || null,
            inventory_id: inventory.id,
            reference: payload.reference || null,
            business_id: payload.businessId,
            idempotency_key: key,
            created_by: payload.restockedBy,
            store_id: payload.storeId,
            variant_id: variant.variantId,
            created_at: new Date(),
          });
          await manager.getRepository(InventoryLog).save(log);

          results.push({
            message: 'Variant restocked successfully',
            variant_id: variant.variantId,
            inventory_id: inventory.id,
            quantity: variant.quantity,
            store_id: payload.storeId,
            restocked_by: payload.restockedBy,
            idempotency_key: key,
          });
        }

        // 🔹 Emit one event with all variants (outside DB ops but still inside tx flow)
        //             await this.eventEmitterHelper.emitEvent(
        //                 "inventory.events",
        //                 payload.store_id,
        //                 "InventoryRestocked",
        //                 {
        //                     store_id: payload.store_id,
        //                     restocked_by: payload.restocked_by,
        //                     variants: results
        //                 }
        //             );
        //
        return { results, message: results[0].message };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'restockVariants');
    }
  }

  async deductStock(dto: DeductStockDto) {
    try {
      // 1. Default idempotency key if not provided
      const key = dto.idempotency_key || uuidv4();

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
      // Get user info
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, name, email,businesses(email)')
        .eq('id', dto.deductions[0].created_by)
        .maybeSingle();
      if (userError) throw new BadRequestException(userError.message);

      const ownerEmail = user?.businesses.email;

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
            stock_at_trigger: inventory.quantity,
            store_id: deduction.store_id,
            created_at: new Date().toISOString(),
          });

          await this.eventEmitterHelper.emitEvent(
            'inventory.events',
            deduction.store_id,
            'InventoryStockAlert',
            {
              store_id: deduction.store_id,
              variant_id: deduction.variant_id,
              stock_at_trigger: inventory.quantity,
              threshold: updatedInventory.low_stock_threshold,
              triggered_at: new Date().toISOString(),
              inventory_id: updatedInventory.id,
              ownerEmail,
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
      //             await this.eventEmitterHelper.emitEvent(
      //                 "inventory.events",
      //                 dto.deductions[0].store_id, // assuming all deductions are same store
      //                 "InventoryDeducted",
      //                 {
      //                     idempotency_key: key,
      //                     deductions: results,
      //                     created_by: dto.deductions[0].created_by
      //                 }
      //             );
      //
      return {
        message: 'Stock deducted successfully',
        deductions: results,
        idempotency_key: key,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deductStock');
    }
  }
  async getLowAndOutStocks(storeId: string) {
    try {
      // Get inventories with variant + product details
      const inventories = await this.inventoryRepo.find({
        where: { store_id: storeId },
        relations: ['productVariant', 'productVariant.product'], // join product + variant
      });

      const items: any[] = [];

      for (const inv of inventories) {
        const quantity = inv.quantity ?? 0;
        const lowStockThreshold = inv.low_stock_quantity ?? 0;

        let status: string | null = null;
        if (quantity === 0) {
          status = 'Out of Stock';
        } else if (quantity > 0 && quantity < lowStockThreshold) {
          status = 'Low Stock';
        }

        if (status) {
          items.push({
            productId: inv.productVariant.product.id,
            productName: inv.productVariant.product.name,
            variantId: inv.productVariant.id,
            variantName: inv.productVariant.name,
            sku: inv.productVariant.sku,
            category: inv.productVariant.product.category_type,
            stock: quantity,
            imageUrl: inv.productVariant.image_url,
            lowStockThreshold,
            status, // new field
          });
        }
      }

      return { items };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getLowAndOutStocks');
    }
  }

  /**
   * Helper: Get variant
   */
  private async getVariant(variantId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('id, product_id')
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
   * Delete a batch manually
   */
  async deleteBatch(batchId: string) {
    try {
      const { data: deletedBatch, error } = await this.supabase
        .from('store_inventory_batches')
        .delete()
        .eq('id', batchId)
        .maybeSingle();

      if (error) throw new BadRequestException(error.message);
      if (!deletedBatch) throw new NotFoundException('Batch not found');

      return {
        message: 'Batch deleted successfully',
        batch: deletedBatch,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deletedBatch');
    }
  }

  /**
   * Get all batches for a given variant
   */
  async getBatchesByVariant(variantId: string) {
    try {
      const { data, error } = await this.supabase
        .from('store_inventory_batches')
        .select('*')
        .eq('variant_id', variantId)
        .order('expires_at', { ascending: true });

      if (error) throw new BadRequestException(error.message);

      return data;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getBatchesByVariant');
    }
  }

  /**
   * Get inventory for a store
   */
  async getInventoryByStore(storeId: string) {
    try {
      const { data, error } = await this.supabase
        .from('store_inventory')
        .select(
          `
          id,
          store_id,
          variant_id,
          quantity,
          low_stock_threshold,
          reserved,
          product_variants(
            id,
            name,
            sku,
            image_url,
            products(name)
          )
        `,
        )
        .eq('store_id', storeId);

      if (error) throw new BadRequestException(error.message);

      return data;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getInventoryByStore');
    }
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
