import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { StoreCredit } from './store-credit.entity';

export enum ReturnResolution {
  REFUND = 'refund',
  EXCHANGE = 'exchange',
  STORE_CREDIT = 'store_credit',
}

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
  EXCHANGED = 'exchanged',
  CREDITED = 'credited',
}

@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sale_id: string;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'sale_id', referencedColumnName: 'id' })
  sale: Sale;

  @Column({ type: 'uuid' })
  sale_item_id: string;

  @ManyToOne(() => SaleItem)
  @JoinColumn({ name: 'sale_item_id', referencedColumnName: 'id' })
  sale_item: SaleItem;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({
    type: 'enum',
    enum: ReturnResolution,
    default: ReturnResolution.REFUND,
  })
  resolution: ReturnResolution;

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING,
  })
  status: ReturnStatus;

  @Column({ type: 'text', nullable: true })
  inspection_notes: string | null;

  @Column({ type: 'text', nullable: true })
  staff_id: string | null; // who created the return (cashier)

  @Column({ type: 'text', nullable: true })
  manager_id: string | null; // who approved/rejected

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => StoreCredit, (storeCredit) => storeCredit.return)
  storeCredits: StoreCredit[];
}
