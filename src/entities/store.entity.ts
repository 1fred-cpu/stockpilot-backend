import {
    PrimaryGeneratedColumn,
    Column,
    Entity,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from "typeorm";
import { Business } from "./business.entity";
import { StoreUser } from "./store-user.entity";
import { Category } from "./category.entity";
import { ProductVariant } from "./product-variants.entity";
import { StoreInventory } from "./store-inventory.entity";

@Entity("stores")
export class Store {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    business_id: string; // FK → businesses(id)

    @Column({ type: "text" })
    name: string;

    @Column({ type: "text" })
    location: string;

    @Column({ type: "text" })
    currency: string;

    // 👇 Relation: many stores belong to one business
    @ManyToOne(() => Business, business => business.stores, {
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "business_id", referencedColumnName: "id" }) // explicitly map FK → businesses.id
    business: Business;

    // 👇 Relation: one store can have many store_users
    @OneToMany(() => StoreUser, storeUser => storeUser.store)
    storeUsers: StoreUser[];

    // 👇 Relation: one store can have many categories
    @OneToMany(() => Category, category => category.store)
    categories: Category[];

    @OneToMany(() => ProductVariant, product_variant => product_variant.store)
    product_variants: ProductVariant[];
    
    @OneToMany(() => StoreInventory, store_inventory => store_inventory.store)
    store_inventories: StoreInventory[];

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;
}
