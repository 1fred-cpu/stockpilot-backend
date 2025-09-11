import { forwardRef, Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { BillingModule } from '../billing/billing.module';
import { FileUploadService } from 'src/utils/upload-file';
import { SupabaseModule } from 'src/lib/supabase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from 'src/entities/business.entity';
import { User } from 'src/entities/user.entity';
import { StoreUser } from 'src/entities/store-user.entity';
@Module({
  imports: [
    forwardRef(() => BillingModule),
    SupabaseModule,
    TypeOrmModule.forFeature([Business, User, StoreUser]),
  ],
  controllers: [BusinessController],
  providers: [BusinessService, HandleErrorService, FileUploadService],
  exports: [BusinessService],
})
export class BusinessModule {}
