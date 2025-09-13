import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Business } from './business.entity';
import { StoreUser } from './store-user.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'uuid', nullable: true })
  store_id: string | null; // FK → stores(id), optional because user might not belong to a store

  @Column({ type: 'uuid', nullable: true })
  business_id: string | null; // FK → businesses(id), optional because user might not belong to a business

  @Column({ type: 'text', default: 'active' })
  status: string; // e.g. "active", "inactive", "suspended"

  @Column({ type: 'text', nullable: true })
  role: string | null;

  @Column({ type: 'text', nullable: true })
  auth_provider: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // 👇 Relation: many users can belong to one store
  @ManyToOne(() => Store, (store) => store.storeUsers, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store: Store;

  // 👇 Relation: many users can belong to one business
  @ManyToOne(() => Business, (business) => business.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' })
  business: Business;

  // 👇 Relation: one user can appear in many store_users (assignments)
  @OneToMany(() => StoreUser, (storeUser) => storeUser.user)
  storeUsers: StoreUser[];
}
