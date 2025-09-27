import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Business } from './business.entity';
import { Store } from './store.entity';
import { Product } from './product.entity';
import { Discount } from './discount.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  business_id: string;

  @Column({ type: 'uuid', nullable: true })
  store_id: string;

  @Column({ type: 'text' })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Business, (business) => business.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  @ManyToOne(() => Store, (store) => store.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @OneToMany(() => Discount, (discount) => discount.category)
  discounts: Discount[];
}
