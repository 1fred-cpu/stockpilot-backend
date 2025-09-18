import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FailedFileDeletion } from '../entities/failed-file-deletion.entity';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    @InjectRepository(FailedFileDeletion)
    private readonly failedFileRepo: Repository<FailedFileDeletion>,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient, // inject your Supabase client
  ) {}

  /**
   * Cron job runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async retryFailedDeletions() {
    this.logger.log('Checking for failed file deletions...');

    const failedRecords = await this.failedFileRepo.find({
      take: 20, // limit batch size
      order: { created_at: 'ASC' },
    });

    if (!failedRecords.length) {
      this.logger.log('No failed deletions to process.');
      return;
    }

    for (const record of failedRecords) {
      try {
        this.logger.log(
          `Retrying deletion for file: ${record.bucket_name}/${record.path}`,
        );

        const { error } = await this.supabase.storage
          .from(record.bucket_name)
          .remove([record.path]);

        if (error) {
          this.logger.error(
            `Failed again for ${record.path}: ${error.message}`,
          );
          record.retry_count += 1;
          record.error_message = error.message;
          await this.failedFileRepo.save(record);
        } else {
          this.logger.log(`Successfully deleted: ${record.path}`);
          await this.failedFileRepo.remove(record);
        }
      } catch (err) {
        this.logger.error(
          `Unexpected error while retrying ${record.path}: ${err.message}`,
        );
        record.retry_count += 1;
        record.error_message = err.message;
        await this.failedFileRepo.save(record);
      }
    }
  }
}
