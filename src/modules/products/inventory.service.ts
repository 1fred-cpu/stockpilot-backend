import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RestockDto } from './dto/restock.dto';
import { SellDto } from './dto/sell.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}

  // Helper: ensure store_inventory row exists (upsert-like)
  private async upsertStoreInventory(
    storeId: string,
    variantId: string,
    delta: number,
  ) {
    // Fetch existing inventory
    const { data: existing, error } = await this.supabase
      .from('store_inventory')
      .select('id, quantity')
      .eq('store_id', storeId)
      .eq('variant_id', variantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);

    if (!existing) {
      const { error: insertErr } = await this.supabase
        .from('store_inventory')
        .insert({
          id: uuidv4(),
          store_id: storeId,
          variant_id: variantId,
          quantity: delta,
          reserved: 0,
          updated_at: new Date().toISOString(),
        });
      if (insertErr) throw new BadRequestException(insertErr.message);
      return;
    }

    // update
    const newQty = (existing.quantity ?? 0) + delta;
    const { error: updateErr } = await this.supabase
      .from('store_inventory')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateErr) throw new BadRequestException(updateErr.message);
  }

  /**
   * Restock: insert a batch and update store_inventory
   */
  async restock(storeId: string, dto: RestockDto) {
    try {
      // Validate variant exists
      const { data: variant } = await this.supabase
        .from('product_variants')
        .select('id')
        .eq('id', dto.variant_id)
        .maybeSingle();
      if (!variant) throw new NotFoundException('Variant not found');

      // Insert batch
      const batchId = uuidv4();
      const batchPayload = {
        id: batchId,
        store_id: storeId,
        variant_id: dto.variant_id,
        batch_number: dto.batch_number ?? null,
        quantity: dto.quantity,
        reserved: 0,
        expiry_date: dto.expiry_date ?? null,
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: batchError } = await this.supabase
        .from('store_inventory_batches')
        .insert([batchPayload]);
      if (batchError) throw new BadRequestException(batchError.message);

      // Update aggregated inventory
      await this.upsertStoreInventory(storeId, dto.variant_id, dto.quantity);

      // Optionally emit event: inventory.restoked
      // this.eventEmitter.emit('inventory.events', { event: 'StockRestocked', data: {...} });

      return { message: 'Restocked', batch_id: batchId };
    } catch (err) {
      this.logger.error('Restock failed', err);
      throw err;
    }
  }

  /**
   * Sell: deduct quantity using FIFO by expiry_date first (earliest expiry)
   */
  async sell(storeId: string, dto: SellDto) {
    try {
      const qtyToRemove = dto.quantity;
      if (qtyToRemove <= 0)
        throw new BadRequestException('Quantity must be > 0');

      // 1. get batches with positive quantity, ordered by expiry_date ASC (NULLs last)
      const { data: batches, error } = await this.supabase
        .from('store_inventory_batches')
        .select('id, quantity, expiry_date')
        .eq('store_id', storeId)
        .eq('variant_id', dto.variant_id)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nulls: 'last' });

      if (error) throw new BadRequestException(error.message);
      if (!batches || batches.length === 0)
        throw new BadRequestException('No stock available');

      let remaining = qtyToRemove;
      const updates = [];

      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(b.quantity, remaining);
        const newQty = b.quantity - take;

        // update this batch
        const { error: updateErr } = await this.supabase
          .from('store_inventory_batches')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', b.id);

        if (updateErr) throw new BadRequestException(updateErr.message);

        remaining -= take;
      }

      if (remaining > 0) {
        // rollback not trivial — but we can return an error (or adjust logic to be transactional via Postgres function)
        throw new BadRequestException('Insufficient stock to fulfill sale');
      }

      // update aggregated inventory: subtract qtyToRemove
      await this.upsertStoreInventory(storeId, dto.variant_id, -qtyToRemove);

      // Optionally emit sale event for analytics/orders
      // this.eventEmitter.emit('inventory.events', { event: 'StockSold', data: {...} });

      return { message: 'Sale processed' };
    } catch (err) {
      this.logger.error('Sell failed', err);
      throw err;
    }
  }

  /**
   * Report: find soon-to-expire batches
   */
  async getExpiringBatches(storeId: string, daysWindow = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysWindow);
    const { data, error } = await this.supabase
      .from('store_inventory_batches')
      .select('id, variant_id, batch_number, quantity, expiry_date')
      .eq('store_id', storeId)
      .lt('expiry_date', cutoff.toISOString());

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
