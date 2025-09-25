import {
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Entity
} from "typeorm";
@Entity("return_policies")
export class ReturnPolicy {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    store_id: string;

    @Column({ type: "int", default: 7 })
    days_allowed: number; // e.g. 7 days return window

    @Column({ type: "boolean", default: true })
    allow_refund: boolean;

    @Column({ type: "boolean", default: true })
    allow_exchange: boolean;

    @Column({ type: "boolean", default: true })
    allow_store_credit: boolean;

    @Column({ type: "text", nullable: true })
    notes?: string;

    @CreateDateColumn("timestamptz")
    created_at: Date;

    @UpdateDateColumn("timestamptz")
    updated_at: Date;
}
