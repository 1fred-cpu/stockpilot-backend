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
import { Product } from './product.entity';
import { Store } from './store.entity';
import { StoreInventory } from './store-inventory.entity';
import { SaleItem } from './sale-item.entity';
import { InventoryLog } from './inventory-log.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  sku: string;

  @Column({ type: 'decimal' })
  price: number;

  @Column({ type: 'text' })
  image_url: string;

  @Column({ type: 'uuid' })
  store_id: string;

  // @Column({ type: 'jsonb', array: true })
  // attributes: Record<any, any>[];

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'boolean', default: false })
  tracks_expiry: boolean;

  @ManyToOne(() => Product, (product) => product.product_variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product: Product;

  @ManyToOne(() => Store, (store) => store.product_variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @ManyToOne(() => Business, (business) => business.product_variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  @OneToMany(
    () => StoreInventory,
    (store_inventory) => store_inventory.product_variant,
  )
  store_inventories: StoreInventory[];

  @OneToMany(() => SaleItem, (sale_item) => sale_item.product_variant)
  sale_items: SaleItem[];

  @OneToMany(
    () => InventoryLog,
    (inventory_log) => inventory_log.product_variant,
  )
  inventory_logs: InventoryLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
