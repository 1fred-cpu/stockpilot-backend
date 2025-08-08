import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { StoresModule } from "./modules/stores/stores.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SupabaseModule } from "lib/supabase.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
    imports: [
        // Load environment variables from .env file
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env"
        }),
        ThrottlerModule.forRoot([
            {
                name: "short", // profile name
                ttl: 60, // 60 seconds
                limit: 100 // global limit
            },
            {
                name: "strict", // another profile
                ttl: 60,
                limit: 5 // for sensitive endpoints
            }
        ]),

        SupabaseModule,
        StoresModule
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


