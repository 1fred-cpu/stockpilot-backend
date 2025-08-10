import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SupabaseModule } from 'lib/supabase.module';
import { MailModule } from 'utils/mail/mail.module';
@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
