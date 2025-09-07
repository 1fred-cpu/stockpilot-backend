// invite-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';

@Injectable()
export class InviteCleanupService {
  private readonly logger = new Logger(InviteCleanupService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleInviteCleanup() {
    try {
      this.logger.log('Starting expired invites cleanup...');

      const now = new Date().toISOString();

      const { error } = await this.supabase
        .from('invites')
        .delete()
        .lt('expires_at', now);

      if (error) {
        this.logger.error(`Error cleaning invites: ${error.message}`);
      } else {
        this.logger.log('Expired invites cleanup completed successfully');
      }
    } catch (err) {
      this.logger.error(`Unexpected error during cleanup: ${err.message}`);
    }
  }
}
