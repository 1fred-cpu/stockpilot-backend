import { Module } from '@nestjs/common';
import { BusinessListener } from './business.listener';
import { SupabaseModule } from 'src/lib/supabase.module';
import { PermissionModule } from '../../modules/permission/permission.module';
import { BillingModule } from '../../modules/billing/billing.module';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
@Module({
  imports: [
    SupabaseModule,
    PermissionModule,
    BillingModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  providers: [BusinessListener],
})
export class BusinessListenerModule {}
