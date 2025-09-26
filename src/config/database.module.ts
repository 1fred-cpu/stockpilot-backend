import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Business } from "../entities/business.entity";
import { User } from "src/entities/user.entity";
import { StoreUser } from "src/entities/store-user.entity";
import { Store } from "src/entities/store.entity";
import { Product } from "src/entities/product.entity";
import { Category } from "src/entities/category.entity";
import { ProductVariant } from "src/entities/product-variant.entity";
import { StoreInventory } from "src/entities/store-inventory.entity";
import { InventoryLog } from "src/entities/inventory-log.entity";
import { StockAlert } from "src/entities/stock-alert.entity";
import { Refund } from "src/entities/refund.entity";
import { FailedFileDeletion } from "../entities/failed-file-deletion.entity";
import { Invite } from "src/entities/invite.entity";
import { Return } from "src/entities/return.entity";
import { StoreCredit } from "src/entities/store-credit.entity";
import { Exchange } from "src/entities/exchange.entity";
import { ReturnPolicy } from "src/entities/return-policy.entity";

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

                synchronize: false, // ❌ disable in production, use migrations,
              migrations: [__dirname +
                '.../migration/*{.ts,.js}'],
                entities: [
                    Business,
                    User,
                    Store,
                    StoreUser,
                    Product,
                    Category,
                    ProductVariant,
                    StoreInventory,
                    InventoryLog,
                    StockAlert,
                    Refund,
                    Return,
                    FailedFileDeletion,
                    Invite,
                    StoreCredit,
                    Exchange,
                    ReturnPolicy
                ]
            })
        })
    ]
})
export class DatabaseModule {}
