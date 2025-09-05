import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { MailModule } from 'src/utils/mail/mail.module';
@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
