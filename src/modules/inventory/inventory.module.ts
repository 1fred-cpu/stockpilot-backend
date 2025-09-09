import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { MailModule } from 'src/utils/mail/mail.module';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [InventoryController],
  providers: [InventoryService, HandleErrorService, EventEmitterHelper],
  exports: [InventoryService],
})
export class InventoryModule {}
