import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn
} from "typeorm";
import { SaleItem } from "./sale-item.entity";

@Entity("return_items")
export class ReturnItem {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    sale_item_id: string;

    @ManyToOne(() => SaleItem, { eager: true })
    @JoinColumn({ name: "sale_item_id" })
    sale_item: SaleItem;

    @Column("int")
    quantity: number;

    @Column({ type: "text", nullable: true })
    reason: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
}
