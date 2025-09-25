import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Store } from './store.entity';
import { Business } from './business.entity';
import { User } from './user.entity';
import { Refund } from './refund.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'float8' })
  total_amount: number;

  @Column({ type: 'float8' })
  total_discount: number;

  @Column({ type: 'float8', nullable: true })
  total_tax: number | undefined;

  @Column({ type: 'float8' })
  net_amount: number;

  @Column({ type: 'text' })
  payment_status: string;

  @Column({ type: 'text' })
  payment_method: string;

  @Column({ type: 'text', nullable: true })
  customer_email: string | undefined;

  @Column({ type: 'text', nullable: true })
  customer_phone: string | undefined;

  @Column({ type: 'text' })
  customer_name: string;

  @Column({ type: 'text', nullable: true })
  pdf_url: string | undefined;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  /** Relations */
  // 👇 Relation: many sales belong to store
  @ManyToOne(() => Store, (store) => store.sales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  // 👇 Relation: many sales belong to business
  @ManyToOne(() => Business, (business) => business.sales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  // 👇 Relation: many sales can be created by a user
  @ManyToOne(() => User, (user) => user.sales)
  @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
  user: User;

  // 👇 Relation: many sales can be created by a user
  @OneToMany(() => SaleItem, (saleItem) => saleItem.sale)
  saleItems: SaleItem[];

  @OneToMany(() => Refund, (refund) => refund.sale)
  refunds: Refund[];
}
