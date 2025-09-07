import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StoresModule } from './modules/stores/stores.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from 'src/lib/supabase.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { RoleMiddleware } from './middleware/role/role.middleware';
import { UsersModule } from './modules/users/users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { AuthMiddlewareModule } from './middleware/auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BillingModule } from './modules/billing/billing.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { BusinessModule } from './modules/business/business.module';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesServiceModule } from './schedules/schedule.module';
@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Setup a Rate Limitting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 60 seconds
          limit: 20, // global limit
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    SchedulesServiceModule, // This contains all schedule services

    //Middlewares
    AuthMiddlewareModule,

    //Modules
    BusinessModule,
    StoresModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    UsersModule,
    OnboardingModule,
    AnalyticsModule,
    BillingModule,
    DiscountsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 👈 This makes it global automatically
    },
  ],
})
export class AppModule {
  //Middlewares
  // configure(consumer: MiddlewareConsumer) {
  //         consumer
  //             .apply(SupabaseAuthMiddleware, RoleMiddleware)
  //             .exclude("/v1/api/onboarding/:owner_id")
  //             .forRoutes("*"); // applies everywhere
  //     }
}
