import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { SupabaseModule } from '../../lib/supabase.module';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
@Module({
  imports: [SupabaseModule],
  controllers: [DiscountsController],
  providers: [DiscountsService, HandleErrorService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
