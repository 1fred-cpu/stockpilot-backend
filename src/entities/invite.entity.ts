import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Business } from './business.entity';

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  store_id: string;

  @ManyToOne(() => Store, (store) => store.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid', nullable: true })
  business_id: string;

  @ManyToOne(() => Business, (business) => business.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'text', nullable: true })
  role: string;

  @Column({ type: 'text', nullable: true })
  invited_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'text', nullable: true })
  email: string;
}