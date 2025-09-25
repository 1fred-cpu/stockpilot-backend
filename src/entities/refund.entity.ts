import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Return } from './return.entity';
import { Store } from './store.entity';
import { Sale } from './sale.entity';

export enum RefundStatus {
  INITIATED = 'initiated',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  return_id: string;

  @ManyToOne(() => Return, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_id', referencedColumnName: 'id' })
  return: Return;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store, (store) => store.refunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @Column({ type: 'float8', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  method: string; // cash | card | store_credit etc.

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.INITIATED,
  })
  status: RefundStatus;

  @ManyToOne(() => Sale, (sale) => sale.refunds)
  sale: Sale;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
