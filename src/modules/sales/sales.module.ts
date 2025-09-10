import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SupabaseModule } from '../../lib/supabase.module';
import { InventoryModule } from '../inventory/inventory.module';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { SalesEventsListener } from 'src/event-listeners/sales-events.listener';
@Module({
  imports: [SupabaseModule, InventoryModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    HandleErrorService,
    EventEmitterHelper,
    SalesEventsListener,
  ],
})
export class SalesModule {}
