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
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { StoreInventory } from './store-inventory.entity';
import { Sale } from './sale.entity';
import { Customer } from './customer.entity';
import { SaleItem } from './sale-item.entity';
import { StockAlert } from './stock-alert.entity';
import { InventoryLog } from './inventory-log.entity';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Invite } from './invite.entity';
import { StoreCredit } from './store-credit.entity';
import { Refund } from './refund.entity';
import { Exchange } from './exchange.entity';

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

  @Column({ type: 'text', nullable: true, default: null })
  address: string | undefined;

  @Column({ type: 'text', nullable: true, unique: true, default: null })
  email: string | undefined;

  @Column({ type: 'text', nullable: true, unique: true, default: null })
  phone: string | undefined;

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

  // // 👇 Relation: one store can have many users
  // @OneToMany(() => User, (user) => user.store)
  // users: User[];

  // 👇 Relation: one store can have many store_users
  @OneToMany(() => StoreUser, (storeUser) => storeUser.store)
  storeUsers: StoreUser[];

  // 👇 Relation: one store can have many categories
  @OneToMany(() => Category, (category) => category.store)
  categories: Category[];

  // 👇 Relation: one store can have many products
  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  // 👇 Relation: one store can have many product variants
  @OneToMany(() => ProductVariant, (productVariant) => productVariant.store)
  productVariants: ProductVariant[];

  // 👇 Relation: one store can have many store_inventories
  @OneToMany(() => StoreInventory, (storeInventory) => storeInventory.store)
  storeInventories: StoreInventory[];

  // 👇 Relation: one store can have many sales
  @OneToMany(() => Sale, (sale) => sale.store)
  sales: Sale[];

  // 👇 Relation: one store can have many customers
  @OneToMany(() => Customer, (customer) => customer.store)
  customers: Customer[];

  // 👇 Relation: one store can have many sale_items
  @OneToMany(() => SaleItem, (saleItem) => saleItem.store)
  saleItems: SaleItem[];

  // 👇 Relation: one store can have many inventory_logs
  @OneToMany(() => InventoryLog, (inventoryLog) => inventoryLog.store)
  inventoryLogs: InventoryLog[];

  // 👇 Relation: one store can have many stock_alerts
  @OneToMany(() => StockAlert, (stockAlert) => stockAlert.store)
  stockAlerts: StockAlert[];

  // 👇 Relation: one store can have many invites
  @OneToMany(() => Invite, (invite) => invite.store)
  invites: Invite[];

  // 👇 Relation: one store can have many storeCredits
  @OneToMany(() => StoreCredit, (storeCredit) => storeCredit.store)
  storeCredits: StoreCredit[];

  // 👇 Relation: one store can have many refunds
  @OneToMany(() => Refund, (refund) => refund.store)
  refunds: Refund[];

  // 👇 Relation: one store can have many exchange items
  @OneToMany(() => Exchange, (exchange) => exchange.store)
  exchanges: Exchange[];
}
