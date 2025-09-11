import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Business } from "../entities/business.entity";
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }), // to use .env
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres",
                url: config.get<string>("SUPABASE_DB_URI"), // from Supabase
                autoLoadEntities: true, // automatically load entities
                synchronize: config.get<string>("NODE_ENV") === "development" // ❌ disable in production, use migrations
            })
        }),
        TypeOrmModule.forFeature([Business])
    ]
})
export class DatabaseModule {}
