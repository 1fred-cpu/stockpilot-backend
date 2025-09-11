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
import { Business } from './business.entity';
import { StoreUser } from './store-user.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string; // FK → businesses(id)

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text' })
  currency: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // 👇 Relation: many stores belong to one business
  @ManyToOne(() => Business, (business) => business.stores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id', referencedColumnName: 'id' }) // explicitly map FK → businesses.id
  business: Business;

  // 👇 Relation: one store can have many store_users
  @OneToMany(() => StoreUser, (storeUser) => storeUser.store)
  storeUsers: StoreUser[];
}
