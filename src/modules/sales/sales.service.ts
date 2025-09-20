import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from '../inventory/inventory.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { generateReference } from 'src/utils/generate-reference';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { Sale } from '../../entities/sale.entity';
import { Store } from '../../entities/store.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { InventoryLog } from '../../entities/inventory-log.entity';
import { Customer } from '../../entities/customer.entity';
import { StockAlert } from 'src/entities/stock-alert.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, Between } from 'typeorm';
import { DeductStockDto } from './dto/deduct-stock.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly inventoryService: InventoryService,
    private readonly errorHandler: HandleErrorService,
    private readonly eventEmitterHelper: EventEmitterHelper,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(InventoryLog)
    private readonly inventoryLogRepo: Repository<InventoryLog>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(StockAlert)
    private readonly stockAlertRepo: Repository<StockAlert>,
    @InjectRepository(StoreInventory)
    private readonly inventoryRepo: Repository<StoreInventory>,
    private readonly dataSource: DataSource,
  ) {}

  async getAnalytics(storeId: string, startDate?: string, endDate?: string) {
    try {
      if (!storeId) {
        throw new BadRequestException('storeId is required');
      }

      const dateRange = {
        gte: startDate || '1900-01-01',
        lte: endDate || new Date().toISOString(),
      };

      // 1. KPIs
      const { data: salesData, error: salesError } = await this.supabase
        .from('sales')
        .select('totalPrice')
        .eq('storeId', storeId)
        .gte('saleDate', dateRange.gte)
        .lte('saleDate', dateRange.lte);

      if (salesError) throw new BadRequestException(salesError.message);

      const totalSales = salesData.length;
      const totalRevenue = salesData.reduce(
        (sum, s) => sum + (s.totalPrice || 0),
        0,
      );
      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // 2. Sales over time
      const { data: timelineData, error: timelineError } = await this.supabase
        .from('sales')
        .select('saleDate, totalPrice')
        .eq('storeId', storeId)
        .gte('saleDate', dateRange.gte)
        .lte('saleDate', dateRange.lte)
        .order('saleDate', { ascending: true });

      if (timelineError) throw new BadRequestException(timelineError.message);

      const salesByDate: Record<
        string,
        { totalSales: number; totalRevenue: number }
      > = {};
      timelineData.forEach((row) => {
        const date = row.saleDate.split('T')[0];
        if (!salesByDate[date]) {
          salesByDate[date] = { totalSales: 0, totalRevenue: 0 };
        }
        salesByDate[date].totalSales += 1;
        salesByDate[date].totalRevenue += row.totalPrice || 0;
      });

      // 3. Top products
      const { data: topProductsData, error: topProductsError } =
        await this.supabase
          .from('sales')
          .select(`productId, quantity, totalPrice, products(name)`)
          .eq('storeId', storeId)
          .gte('saleDate', dateRange.gte)
          .lte('saleDate', dateRange.lte);

      if (topProductsError)
        throw new BadRequestException(topProductsError.message);

      const productStats: Record<
        string,
        { name: string; unitsSold: number; totalRevenue: number }
      > = {};
      topProductsData.forEach((row) => {
        const name = row.products?.name || 'Unknown Product';
        if (!productStats[name]) {
          productStats[name] = {
            name,
            unitsSold: 0,
            totalRevenue: 0,
          };
        }
        productStats[name].unitsSold += row.quantity || 0;
        productStats[name].totalRevenue += row.totalPrice || 0;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 5);

      return {
        kpis: {
          totalSales,
          totalRevenue,
          averageOrderValue: avgOrderValue,
          topProduct: topProducts[0] || null,
        },
        salesOverTime: Object.entries(salesByDate).map(([date, stats]) => ({
          date,
          totalSales: stats.totalSales,
          totalRevenue: stats.totalRevenue,
        })),
        topProducts,
      };
    } catch (error) {
      this.logger.error(`Error in getAnalytics: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'An error occurred while fetching sales analytics',
      );
    }
  }

  /**
   *
   * @param dto
   * @returns
   */
  async createSale(dto: CreateSaleDto) {
    try {
      return this.dataSource.transaction(async (manager) => {
        // 1. Ensure store exists
        const store = await manager.findOne(Store, {
          where: { id: dto.store_id, business_id: dto.business_id },
        });
        if (!store) {
          throw new NotFoundException('Cannot find store');
        }
        // 2. Ensure items exists
        for (const item of dto.items) {
          const existingItem = await this.inventoryRepo.findOne({
            where: { variant_id: item.variant_id },
          });
          if (!existingItem) {
            throw new NotFoundException(
              `Item with a variant ID ${item.variant_id} does'nt exists`,
            );
          }

          if (item.quantity > existingItem.quantity) {
            throw new BadRequestException(`Not enough stock for
                      ${item.variant_id}
                      `);
          }
        }

        // 3. Idempotency check
        const existingLog = await manager.findOne(InventoryLog, {
          where: { idempotency_key: dto.idempotency_key },
        });
        if (existingLog) {
          return {
            message: 'Duplicate request ignored (idempotent)',
            reference: existingLog.reference,
            idempotency_key: existingLog.idempotency_key,
          };
        }

        // 4. Handle customer inside transaction
        let customerEntity;
        if (dto.customer) {
          customerEntity = await this.handleCustomerTransactional(manager, {
            email: dto.customer.email,
            name: dto.customer.name,
            phone: dto.customer.phone,
            store_id: dto.store_id,
          });
        }

        // 6. Create sale
        const sale = manager.create(Sale, {
          store_id: dto.store_id,
          business_id: dto.business_id,
          total_amount: dto.total_amount,
          net_amount: dto.total_amount,
          payment_status: 'paid',
          payment_method: dto.payment_method || 'cash',
          created_by: dto.created_by,
          customer_email: customerEntity?.email || null,
          customer_phone: customerEntity?.phone || null,
          customer_name: customerEntity?.name || null,
        });
        await manager.save(sale);

        const deductions: any[] = [];

        // 7. Insert sale items + build deductions
        for (const item of dto.items) {
          const saleItem = manager.create(SaleItem, {
            sale_id: sale.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            total_price: item.unit_price * item.quantity - (item.discount || 0),
          });
          await manager.save(saleItem);

          deductions.push({
            store_id: dto.store_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            reason: 'sale',
            reference: generateReference('SALE'),
            created_by: dto.created_by,
          });
        }

        // 7. Deduct stock (transactional)
        await this.deductStockTransactional(manager, {
          deductions,
          idempotency_key: dto.idempotency_key || uuidv4(),
        });

        return { message: 'Sale created', sale_id: sale.id };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Request failed. Please try agian later',
      );
    }
  }
  // async getSalesByDay(storeId: string, date?: string) {
  //         try {
  //             // Default to today if no date provided
  //             const targetDate = date ? new Date(date) : new Date();
  //
  //             const startOfDay = new Date(targetDate);
  //             startOfDay.setHours(0, 0, 0, 0);
  //
  //             const endOfDay = new Date(targetDate);
  //             endOfDay.setHours(23, 59, 59, 999);
  //
  //             // Fetch sales with sale_items + product variants
  //             const sales = await this.saleRepo.find({
  //                 where: {
  //                     created_at: Between(startOfDay, endOfDay),
  //                     store_id: storeId
  //                 },
  //                 relations: ["sale_items", "sale_items.product_variant"],
  //                 order: { created_at: "DESC" }
  //             });
  //
  //             if (sales.length === 0) {
  //                 throw new NotFoundException(
  //                     "No sales found for the selected day"
  //                 );
  //             }
  //
  //             // 🔹 Aggregate data
  //             const totalRevenue = sales.reduce(
  //                 (sum, sale) => sum + sale.total_amount,
  //                 0
  //             );
  //             const totalItemsSold = sales.reduce(
  //                 (sum, sale) =>
  //                     sum +
  //                     sale.sale_items.reduce(
  //                         (iSum, item) => iSum + item.quantity,
  //                         0
  //                     ),
  //                 0
  //             );
  //             const averageSaleValue = totalRevenue / sales.length;
  //
  //             return {
  //                 date: startOfDay.toISOString().split("T")[0],
  //                 totalSales: sales.length,
  //                 totalRevenue,
  //                 totalItemsSold,
  //                 averageSaleValue,
  //                 sales
  //             };
  //         } catch (error: any) {
  //             if (error instanceof NotFoundException) throw error;
  //             this.errorHandler.handleServiceError(error, "getSalesByDay");
  //         }
  //     }

  /**
   *
   * @param saleId
   * @param method
   * @param amount
   * @param reference
   */
  async recordPayment(
    saleId: string,
    method: string,
    amount: number,
    reference: string,
  ) {
    const { error } = await this.supabase.from('payments').insert({
      id: uuidv4(),
      sale_id: saleId,
      method,
      amount,
      reference,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    if (error) throw new BadRequestException(error.message);

    await this.supabase
      .from('sales')
      .update({ payment_status: 'paid' })
      .eq('id', saleId);
  }

  /**
   *
   * @param saleId
   * @param variantId
   * @param quantity
   * @param reason
   * @param createdBy
   */
  async createRefund(
    saleId: string,
    variantId: string,
    quantity: number,
    reason: string,
    createdBy: string,
  ) {
    const { error } = await this.supabase.from('refunds').insert({
      id: crypto.randomUUID(),
      sale_id: saleId,
      variant_id: variantId,
      quantity,
      refund_amount: 0, // calculate later
      reason,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    });

    if (error) throw new BadRequestException(error.message);
  }
  private async deductStockTransactional(manager: any, dto: DeductStockDto) {
    const key = dto.idempotency_key || uuidv4();

    // Check if already processed
    const existingLogs = await manager.find(InventoryLog, {
      where: { idempotency_key: key },
    });
    if (existingLogs.length > 0) {
      return {
        message: 'Duplicate request ignored (idempotent)',
        deductions: existingLogs.map((log) => ({
          variant_id: log.variant_id,
          deducted: log.change,
          reason: log.reason,
          created_at: log.created_at,
        })),
        idempotency_key: key,
      };
    }

    const results: any[] = [];

    for (const deduction of dto.deductions) {
      // 1. Get inventory row
      const inventory = await manager.findOne(StoreInventory, {
        where: {
          store_id: deduction.store_id,
          variant_id: deduction.variant_id,
        },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory not found for variant ${deduction.variant_id}`,
        );
      }

      // 2. Check stock availability
      if (inventory.quantity < deduction.quantity) {
        throw new BadRequestException(
          `Not enough stock for variant ${deduction.variant_id}`,
        );
      }

      // 3. Update stock
      inventory.quantity = inventory.quantity - deduction.quantity;
      await manager.save(inventory);

      // 4. Log deduction
      const log = manager.create(InventoryLog, {
        idempotency_key: key,
        inventory_id: inventory.id,
        change: deduction.quantity,
        type: 'deduct',
        reference: deduction.reference,
        created_by: deduction.created_by,
        store_id: deduction.store_id,
        variant_id: deduction.variant_id,
        reason: deduction.reason,
      });
      await manager.save(log);

      // 5. Push result
      results.push({
        variant_id: deduction.variant_id,
        deducted: deduction.quantity,
        remaining: inventory.quantity,
      });

      // 6. Low stock alert (optional: save in `stock_alerts`)
      if (inventory.quantity <= inventory.low_stock_threshold) {
        const alert = manager.create(StockAlert, {
          threshold: inventory.low_stock_threshold,
          status: 'low stock',
          triggered_at: new Date(),
          inventory_id: inventory.id,
          stock_at_trigger: inventory.quantity,
          store_id: deduction.store_id,
        });
        await manager.save(alert);
      }
    }

    return {
      message: 'Stock deducted successfully',
      deductions: results,
      idempotency_key: key,
    };
  }
  async getDailySales(storeId: string, date?: string) {
    try {
      // 🔹 Default to today if no date provided
      const targetDate = date ? new Date(date) : new Date();

      // Normalize to start and end of the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 🔹 Fetch sales including sale items and product variants
      const sales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startOfDay, endOfDay),
        },
        relations: [
          'sale_items',
          'sale_items.product_variant',
          'sale_items.product_variant.product',
        ],
        order: { created_at: 'ASC' },
      });

      // 🔹 Flatten all sale items
      const saleItems = sales.flatMap((sale) =>
        sale.sale_items.map((item) => ({
          sale_id: sale.id,
          customer: sale.customer_name,
          created_at: sale.created_at,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          product_variant: {
            product_name: item.product_variant?.product?.name,
            id: item.product_variant?.id,
            sku: item.product_variant?.sku,
            name: item.product_variant?.name,
            image_url: item.product_variant.image_url,
          },
        })),
      );

      // 🔹 Calculate total sales amount
      const totalAmount = saleItems.reduce(
        (sum, item) => sum + item.total_price,
        0,
      );

      return {
        date: startOfDay.toISOString().split('T')[0],
        totalAmount,
        saleItems,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getDailySales');
    }
  }

  private async handleCustomerTransactional(
    manager: EntityManager,
    customer: {
      store_id: string;
      name?: string;
      email?: string;
      phone?: string;
    },
  ) {
    // Try to find existing customer by email/phone within store
    const existing = await manager.findOne(Customer, {
      where: [
        { store_id: customer.store_id, email: customer.email },
        { store_id: customer.store_id, phone: customer.phone },
      ],
    });

    if (existing) {
      // Update customer
      existing.name = customer.name || existing.name;
      existing.email = customer.email || existing.email;
      existing.phone = customer.phone || existing.phone;
      return manager.save(existing);
    } else {
      // Insert new
      const newCustomer = manager.create(Customer, {
        store_id: customer.store_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      });
      return manager.save(newCustomer);
    }
  }

  /**
   *
   * @param storeId
   * @returns
   */
  private async findStore(storeId: string) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
    });
    return store;
  }
  /** 
  @param dto
 */
  private async handleCustomer(dto: any) {
    // 1. Check customer exists
    const existingCustomer = await this.customerRepo.findOne({
      where: { email: dto.email },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // 2. Create customer if not exists
    const newCustomer = await this.customerRepo.create({
      id: uuidv4(),
      name: dto.name,
      email: dto.email,
      store_id: dto.store_id,
      phone: dto.phone,
    });
    await this.customerRepo.save(newCustomer);
    return newCustomer;
  }
}
