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
import { User } from "./user.entity";
import { StoreInventory } from "./store-inventory.entity";
import { ProductVariant } from "./product-variants.entity";

@Entity("inventory_logs")
export class InventoryLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    business_id: string;

    @Column({ type: "uuid" })
    inventory_id: string;

    @Column({ type: "uuid" })
    store_id: string;

    @Column({ type: "uuid"})
    variant_id: string;

    @Column({ type: "numeric", default: 0 })
    change: number;

    @Column({ type: "text" })
    type: string;

    @Column({ type: "text", nullable: true })
    reason: number;

    @Column({ type: "text" })
    reference: string;

    @Column({ type: "text" })
    idempotency_key: string;

    @Column({ type: "uuid" })
    created_by: string;

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @ManyToOne(() => Business, business => business.inventory_logs, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "business_id", referencedColumnName: "id" })
    business: Business;

    @ManyToOne(
        () => ProductVariant,
        product_variant => product_variant.inventory_logs,
        { onDelete: "SET NULL" }
    )
    @JoinColumn({ name: "variant_id", referencedColumnName: "id" })
    product_variant: ProductVariant;

    @ManyToOne(
        () => StoreInventory,
        store_inventory => store_inventory.inventory_logs,
        { onDelete: "SET NULL" }
    )
    @JoinColumn({ name: "inventory_id", referencedColumnName: "id" })
    store_inventory: StoreInventory;

    @ManyToOne(() => Store, store => store.inventory_logs, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "store_id", referencedColumnName: "id" })
    store: Store;

    @ManyToOne(() => User, user => user.inventory_logs, {
        onDelete: "SET NULL"
    })
    @JoinColumn({ name: "created_by", referencedColumnName: "id" })
    user: User;
}
