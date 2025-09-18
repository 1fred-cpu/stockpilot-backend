import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    JoinColumn,
    ManyToOne,
    OneToMany
} from "typeorm";
import { Business } from "./business.entity";
import { Category } from "./category.entity";
import { Store } from "./store.entity";
import { InventoryLog } from "./inventory-log.entity";
import { ProductVariant } from "./product-variants.entity";
import { StockAlert } from "./stock-alert.entity";

@Entity("store_inventory")
export class StoreInventory {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    business_id: string;

    @Column({ type: "uuid" })
    store_id: string;

    @Column({ type: "uuid", unique: true })
    variant_id: string;

    @Column({ type: "int", default: 0 })
    quantity: number;

    @Column({ type: "int", default: 0 })
    total_quantity: number;

    @Column({ type: "int", default: 0 })
    reserved: number;

    @Column({ type: "int", default: 0 })
    low_stock_quantity: number;

    @ManyToOne(() => Business, business => business.store_inventories, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "business_id", referencedColumnName: "id" })
    business: Business;

    @ManyToOne(
        () => ProductVariant,
        product_variant => product_variant.store_inventories,
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "variant_id", referencedColumnName: "id" })
    product_variant: ProductVariant;

    @ManyToOne(() => Store, store => store.store_inventories, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "store_id", referencedColumnName: "id" })
    store: Store;

    @OneToMany(
        () => InventoryLog,
        inventory_log => inventory_log.store_inventory
    )
    inventory_logs: InventoryLog[];

    @OneToMany(() => StockAlert, stock_alert => stock_alert.store_inventory)
    stock_alerts: StockAlert[];

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;
}
