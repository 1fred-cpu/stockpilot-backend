import {
    PrimaryGeneratedColumn,
    Column,
    Entity,
    CreateDateColumn,
    OneToMany,
    UpdateDateColumn
} from "typeorm";
import { Store } from "./store.entity";
import { User } from "./user.entity";
import { StoreUser } from "./store-user.entity";
import { Product } from "./product.entity";
import { Category } from "./category.entity";
import { ProductVariant } from "./product-variants.entity";
import { StoreInventory } from "./store-inventory.entity";
import { Sale } from "./sale.entity";
import { Customer } from "./customer.entity";
import { SaleItem } from "./sale-item.entity";
import { InventoryLog } from "./inventory-log.entity";
import { StockAlert } from "./stock-alert.entity";

@Entity("businesses")
export class Business {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "text" })
    name: string;

    @Column({ type: "uuid", unique: true })
    owner_user_id: string;

    @Column({ type: "text", unique: true })
    email: string;

    @Column({ type: "text", unique: true })
    phone: string;

    @Column({ type: "text", nullable: true })
    logo_url: string;

    @Column({ type: "text", nullable: true })
    website?: string;

    @Column({ type: "text", nullable: true })
    stripe_customer_id?: string;

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;

    // 👇 Relation: one business can have many stores
    @OneToMany(() => Store, store => store.business)
    stores: Store[];

    // 👇 Relation: one business can have many store_users
    @OneToMany(() => StoreUser, storeUser => storeUser.business)
    storeUsers: StoreUser[];

    // 👇 Relation: one business can have many users
    @OneToMany(() => User, user => user.business)
    users: User[];

    // 👇 Relation: one business can have many products
    @OneToMany(() => Product, product => product.business)
    products: Product[];

    // 👇 Relation: one business can have many categories
    @OneToMany(() => Category, category => category.business)
    categories: Category[];

    // 👇 Relation: one business can have many product_variants
    @OneToMany(
        () => ProductVariant,
        product_variant => product_variant.business
    )
    product_variants: ProductVariant[];

    // 👇 Relation: one business can have many store_inventories
    @OneToMany(
        () => StoreInventory,
        store_inventory => store_inventory.business
    )
    store_inventories: StoreInventory[];

    // 👇 Relation: one business can have many sales
    @OneToMany(() => Sale, sale => sale.business)
    sales: Sale[];

    // 👇 Relation: one business can have many customers
    @OneToMany(() => Customer, customer => customer.business)
    customers: Customer[];

    // 👇 Relation: one business can have many sales_items
    @OneToMany(() => SaleItem, sale_item => sale_item.business)
    sale_items: SaleItem[];

    // 👇 Relation: one business can have many inventory_logs
    @OneToMany(() => InventoryLog, inventory_log => inventory_log.business)
    inventory_logs: InventoryLog[];
    
    // 👇 Relation: one business can have many stock_alerts
    @OneToMany(() => StockAlert, stock_alert => stock_alert.business)
    stock_alerts: StockAlert[];
}
