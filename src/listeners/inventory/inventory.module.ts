import { Module } from '@nestjs/common';
import { InventoryConsumer } from './inventory.consumer';
import { SupabaseModule } from 'src/lib/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [InventoryConsumer],
})
export class InventoryConsumerModule {}
