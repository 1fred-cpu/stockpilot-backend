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
import { ProductVariant } from "./product-variants.entity";

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

    @Column({ type: "numeric", default: 0 })
    quantity: number;

    @Column({ type: "numeric", default: 0 })
    reserved: number;

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

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;
}
