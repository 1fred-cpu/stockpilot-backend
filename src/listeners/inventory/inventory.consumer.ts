// inventory.consumer.ts
import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SupabaseClient } from '@supabase/supabase-js';

@Controller()
export class InventoryConsumer {
  private readonly logger = new Logger(InventoryConsumer.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  @EventPattern('store.events')
  async handleStoreEvents(@Payload() message: any) {
    const { event, data } = JSON.parse(message.value.toString());

    if (event === 'StoreCreated') {
      await this.handleStoreCreated(data);
    }
  }

  /** Helpers methods */
  private async handleStoreCreated(store: any) {
    this.logger.log(`Received StoreCreated event for store: ${store.id}`);

    // 1. Fetch all products of the business
    const { data: products, error: prodError } = await this.supabase
      .from('products')
      .select('id')
      .eq('business_id', store.business_id);

    if (prodError) {
      this.logger.error(`Failed to fetch products: ${prodError.message}`);
      return;
    }

    if (!products || products.length === 0) {
      this.logger.log(
        `No products found for business ${store.business_id}, skipping inventory init.`,
      );
      return;
    }

    // 2. Insert empty stock rows for each product in this store
    const stockRows = products.map((p) => ({
      store_id: store.id,
      product_id: p.id,
      stock: 0,
      created_at: new Date().toISOString(),
    }));

    const { error: stockError } = await this.supabase
      .from('inventories')
      .insert(stockRows);

    if (stockError) {
      this.logger.error(
        `Failed to init inventory for store ${store.id}: ${stockError.message}`,
      );
    } else {
      this.logger.log(
        `Initialized inventory for store ${store.id} with ${stockRows.length} products.`,
      );
    }
  }
}
