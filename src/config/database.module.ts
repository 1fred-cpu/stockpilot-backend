import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Business } from "../entities/business.entity";
import { User } from "src/entities/user.entity";
import { StoreUser } from "src/entities/store-user.entity";
import { Store } from "src/entities/store.entity";
import { Product } from "src/entities/product.entity";
import { Category } from "src/entities/category.entity";
import { ProductVariant } from "src/entities/product-variants.entity";
import { StoreInventory } from "src/entities/store-inventory.entity";

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
                synchronize: config.get<string>("NODE_ENV") === "development", // ❌ disable in production, use migrations,
                entities: [
                    Business,
                    User,
                    Store,
                    StoreUser,
                    Product,
                    Category,
                    ProductVariant,
                    StoreInventory
                ]
            })
        })
    ]
})
export class DatabaseModule {}
