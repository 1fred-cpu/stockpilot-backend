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
import { ProductVariant } from './product-variants.entity';
import { Store } from './store.entity';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'uuid' })
  sale_id: string;

  @Column({ type: 'uuid' })
  variant_id: string;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'int8', default: 0 })
  quantity: number;

  @Column({ type: 'float8' })
  unit_price: number;

  @Column({ type: 'float8' })
  discount: number;

  @Column({ type: 'float8' })
  total_price: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  /** Relations */

  @ManyToOne(() => Business, (business) => business.sale_items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  @ManyToOne(() => Store, (store) => store.sale_items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @ManyToOne(
    () => ProductVariant,
    (product_variant) => product_variant.sale_items,
  )
  @JoinColumn({ name: 'variant_id', referencedColumnName: 'id' })
  product_variant: ProductVariant;

  @ManyToOne(() => Sale, (sale) => sale.sale_items)
  @JoinColumn({ name: 'sale_id', referencedColumnName: 'id' })
  sale: Sale;
}
