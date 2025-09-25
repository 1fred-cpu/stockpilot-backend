import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Return } from './return.entity';
import { Store } from './store.entity';

export enum StoreCreditStatus {
  ACTIVE = 'active', // usable
  REDEEMED = 'redeemed', // fully used
  EXPIRED = 'expired', // not valid anymore
  PARTIALLY_USED = 'partially_used', // balance remains
  PENDING = 'pending', // balance remains
}

@Entity('store_credits')
export class StoreCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customer_id: string;

  @ManyToOne(() => Customer, (customer) => customer.storeCredits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column('uuid')
  store_id: string;

  @ManyToOne(() => Store, (store) => store.storeCredits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id' })
  store: Store;

  @Column('uuid')
  return_id: string;

  @ManyToOne(() => Return, (ret) => ret.storeCredits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'return_id', referencedColumnName: 'id' })
  return: Return;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number; // total credit issued

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  used_amount: number; // how much has been spent

  @Column({
    type: 'enum',
    enum: StoreCreditStatus,
    default: StoreCreditStatus.ACTIVE,
  })
  status: StoreCreditStatus;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
