import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Business } from './business.entity';
import { Store } from './store.entity';
import { User } from './user.entity'; // 👈 make sure you have a User entity defined

@Entity('store_users')
@Unique(['store_id', 'user_id']) // ensure uniqueness per store
export class StoreUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'uuid' })
  user_id: string; // now properly related to users(id)

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  role: string; // e.g. "manager", "cashier"

  @Column({ type: 'text' })
  status: string; // e.g. "active", "inactive"

  @Column({ type: 'timestamptz' })
  assigned_at: Date;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // 👇 Relation: many users belong to one store
  @ManyToOne(() => Store, (store) => store.storeUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  // 👇 Relation: many store_users belong to one business
  @ManyToOne(() => Business, (business) => business.storeUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  // 👇 Relation: many store_users point to one user
  @ManyToOne(() => User, (user) => user.storeUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
