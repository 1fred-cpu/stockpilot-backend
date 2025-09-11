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

    @Column({ type: "text" })
    logo_url: string;

    @Column({ type: "text", nullable: true })
    website?: string;

    @Column({ type: "text", nullable: true })
    stripe_customer_id?: string;

    // 👇 Relation: one business can have many stores
    @OneToMany(() => Store, store => store.business)
    stores: Store[];

    // 👇 Relation: one business can have many store_users
    @OneToMany(() => StoreUser, storeUser => storeUser.business)
    storeUsers: StoreUser[];

    // 👇 Relation: one business can have many users
    @OneToMany(() => User, user => user.business)
    users: User[];

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;
}
