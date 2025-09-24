import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { Return } from "./return-item.entity";
import { Store } from "./store.entity";

export enum ExchangeStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}

@Entity("exchanges")
export class Exchange {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    return_id: string;

    @ManyToOne(() => Return)
    @JoinColumn({ name: "return_id", referencedColumnName: "id" })
    return: Return;

    @Column({ type: "uuid" })
    store_id: string;

    @ManyToOne(() => Store, store => store.exchanges, { onDelete: "CASCADE" })
    @JoinColumn({ name: "store_id", referencedColumnNamr: "id" })
    store: Store;

    @Column({ type: "uuid" })
    new_product_variant_id: string;

    @Column({ type: "float8", precision: 12, scale: 2, default: 0 })
    price_difference: number;

    @Column({
        type: "enum",
        enum: ExchangeStatus,
        default: ExchangeStatus.PENDING
    })
    status: ExchangeStatus;

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;
}
