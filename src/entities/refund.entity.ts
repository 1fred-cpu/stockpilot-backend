import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn
} from "typeorm";
import { Sale } from "./sale.entity";

@Entity("refunds")
export class Refund {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    sale_id: string;

    @ManyToOne(() => Sale, sale => sale.refunds)
    @JoinColumn({ name: "sale_id" , referencedColumnName:"id"})
    sale: Sale;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    amount: number;

    @Column({ type: "text", nullable: true })
    reason: string;

    @Column({ type: "varchar", default: "completed" }) // pending, completed, rejected
    status: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
}
