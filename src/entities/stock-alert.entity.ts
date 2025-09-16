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
import { Store } from "./store.entity";
import { StoreInventory } from "./store-inventory.entity";

@Entity("stock_alerts")
export class StockAlert {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "numeric" })
    threshold: number;

    @Column({ type: "uuid" })
    inventory_id: string;

    @Column({ type: "uuid" })
    business_id: string;

    @Column({ type: "uuid" })
    store_id: string;

    @Column({ type: "text" })
    status: string;

    @Column({ type: "timestamptz" })
    triggered_at: Date;

    @Column({ type: "numeric" })
    stock_at_trigger: number;

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @ManyToOne(() => Business, business => business.stock_alerts, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "business_id", referencedColumnName: "id" })
    business: Business;

    @ManyToOne(
        () => StoreInventory,
        store_inventory => store_inventory.stock_alerts,
        { onDelete: "SET NULL" }
    )
    @JoinColumn({ name: "inventory_id", referencedColumnName: "id" })
    store_inventory: StoreInventory;

    @ManyToOne(() => Store, store => store.stock_alerts, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "store_id", referencedColumnName: "id" })
    store: Store;
}
