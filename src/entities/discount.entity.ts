import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Product } from './product.entity';
import { Category } from './category.entity';

enum Type {
  PRODUCT = 'product',
  CATEGORY = 'category',
  STORE = 'store',
}
enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}
@Entity('discounts')
export class Discount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store, (store) => store.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'enum', enum: Type })
  type: Type;

  @Column({ type: 'enum', enum: DiscountType })
  discount_type: DiscountType;

  @Column({ type: 'int8', default: 0 })
  value: number;

  @Column({ type: 'uuid', nullable: true, default: null })
  product_id: string | null;

  @ManyToOne(() => Product, (product) => product.discounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true, default: null })
  category_id: string | null;

  @ManyToOne(() => Category, (category) => category.discounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id', referencedColumnName: 'id' })
  category: Category;

  @Column({ type: 'float8', default: 0 })
  min_order_amount: number;

  @Column({ type: 'timestamptz' })
  start_date: Date;

  @Column({ type: 'timestamptz' })
  end_date: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
