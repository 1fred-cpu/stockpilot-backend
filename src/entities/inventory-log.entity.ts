import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Business } from './business.entity';
import { Category } from './category.entity';
import { Store } from './store.entity';
import { User } from './user.entity';
import { StoreInventory } from './store-inventory.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('inventory_logs')
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid', nullable: true })
  inventory_id: string;

  @Column({ type: 'uuid', nullable: true })
  store_id: string;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string;

  @Column({ type: 'numeric', default: 0 })
  change: number;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text', nullable: true })
  reason: number;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text' })
  idempotency_key: string;

  @Column({ type: 'uuid' ,nullable:true, default:null })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Business, (business) => business.inventory_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.inventoryLogs,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'variant_id', referencedColumnName: 'id' })
  productVariant: ProductVariant;

  @ManyToOne(
    () => StoreInventory,
    (storeInventory) => storeInventory.inventoryLogs,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'inventory_id', referencedColumnName: 'id' })
  storeInventory: StoreInventory;

  @ManyToOne(() => Store, (store) => store.inventoryLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @ManyToOne(() => User, (user) => user.inventoryLogs, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
  user: User;
}
