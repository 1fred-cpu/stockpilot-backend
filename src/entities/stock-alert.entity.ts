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
import { Store } from './store.entity';
import { StoreInventory } from './store-inventory.entity';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric' })
  threshold: number;

  @Column({ type: 'uuid' })
  inventory_id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'text' })
  status: string;

  @Column({ type: 'timestamptz' })
  triggered_at: Date;

  @Column({ type: 'numeric' })
  stock_at_trigger: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Business, (business) => business.stock_alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  @ManyToOne(
    () => StoreInventory,
    (storeInventory) => storeInventory.stockAlerts,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'inventory_id', referencedColumnName: 'id' })
  storeInventory: StoreInventory;

  @ManyToOne(() => Store, (store) => store.stockAlerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;
}
