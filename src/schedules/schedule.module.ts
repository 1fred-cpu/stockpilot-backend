import { Module } from '@nestjs/common';
import { InviteCleanupService } from './invite-cleanup.service';
import { SupabaseModule } from 'src/lib/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [InviteCleanupService],
})
export class SchedulesServiceModule {}
