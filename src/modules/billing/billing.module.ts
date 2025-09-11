import { forwardRef, Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { SupabaseModule } from '../../lib/supabase.module';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { BusinessModule } from '../business/business.module';
@Module({
  imports: [SupabaseModule, forwardRef(() => BusinessModule)],
  controllers: [BillingController],
  providers: [BillingService, HandleErrorService],
  exports: [BillingService],
})
export class BillingModule {}
