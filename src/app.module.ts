import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { StoresModule } from "./modules/stores/stores.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SupabaseModule } from "lib/supabase.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { SalesModule } from "./modules/sales/sales.module";
@Module({
    imports: [
        // Load environment variables from .env file
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env"
        }),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name: "short", // profile name
                    ttl: 60, // 60 seconds
                    limit: 100 // global limit
                },
                {
                    name: "strict", // another profile
                    ttl: 60,
                    limit: 5 // for sensitive endpoints
                },
                {
                    name: "default", // another profile
                    ttl: 60,
                    limit: 3 // another default set
                }
            ]
        }),

        SupabaseModule,
        StoresModule,
        ProductsModule,
        InventoryModule,
        SalesModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard // 👈 This makes it global automatically
        }
    ]
})
export class AppModule {}
