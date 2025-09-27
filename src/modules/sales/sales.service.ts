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
import { CreateSaleDto, DeliveryChannel } from './dto/create-sale.dto';
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
import { ReceiptService } from '../../helpers/reciept.helper';
import { ReceiptPdfService } from '../../helpers/reciept-pdf.helper';
import { MailService } from '../../utils/mail/mail.service';

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
    private readonly recieptHelper: ReceiptService,
    private readonly recieptPdfHelper: ReceiptPdfService,
    private readonly mailService: MailService,
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

      // 2. Sales over  time
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
          where: { id: dto.storeId, business_id: dto.businessId },
        });
        if (!store) {
          throw new NotFoundException('Cannot find store');
        }
        // 2. Ensure items exists
        for (const item of dto.items) {
          const existingItem = await this.inventoryRepo.findOne({
            where: { variant_id: item.variantId },
          });
          if (!existingItem) {
            throw new NotFoundException(
              `Item with a variant ID ${item.variantId} does'nt exists`,
            );
          }

          if (item.quantity > existingItem.quantity) {
            throw new BadRequestException(
              `Not enough stock for ${item.variantId}`,
            );
          }
        }

        // 3. Idempotency check
        const existingLog = await manager.findOne(InventoryLog, {
          where: { idempotency_key: dto.idempotencyKey },
        });
        if (existingLog) {
          return {
            message: 'Duplicate request ignored (idempotent)',
            reference: existingLog.reference,
            idempotencyKey: existingLog.idempotency_key,
          };
        }

        // 4. Handle customer inside transaction
        let customerEntity;
        if (dto.customer) {
          customerEntity = await this.handleCustomerTransactional(manager, {
            email: dto.customer.email,
            name: dto.customer.name,
            phone: dto.customer.phone,
            storeId: dto.storeId,
            businessId: dto.businessId,
          });
        }

        // 6. Create sale
        const sale = manager.create(Sale, {
          store_id: dto.storeId,
          business_id: dto.businessId,
          total_amount: dto.totalAmount,
          net_amount: dto.totalAmount,
          payment_status: 'paid',
          payment_method: dto.paymentMethod || 'cash',
          created_by: dto.createdBy,
          total_discount: dto.items.reduce(
            (sum, item) => sum + (item.discount || 0),
            0,
          ),
          reference: dto.reference || generateReference('SALE'),
          idempotency_key: dto.idempotencyKey || uuidv4(),
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
            variant_id: item.variantId,
            business_id: dto.businessId,
            store_id: dto.storeId,
            reference: dto.reference || generateReference('SALE'),
            quantity: item.quantity,
            unit_price: item.unitPrice,
            status: 'sold',
            discount: item.discount || 0,
            total_price: item.unitPrice * item.quantity,
          });
          await manager.save(saleItem);

          deductions.push({
            storeId: dto.storeId,
            variantId: item.variantId,
            quantity: item.quantity,
            reason: 'sale',
            reference: dto.reference || generateReference('SALE'),
            createdBy: dto.createdBy,
          });
        }

        // 7. Deduct stock (transactional)
        await this.deductStockTransactional(manager, {
          deductions,
          idempotencyKey: dto.idempotencyKey || uuidv4(),
        });

        // 8. Generate reciept if needed
        if (dto.isRecieptNeeded) {
          console.log(dto.deliveryChannel);
          if (dto.deliveryChannel === DeliveryChannel.EMAIL) {
            console.log(dto.deliveryChannel);

            await this.handleRecieptOnEmailDelivery(manager, sale.id);
          }
        }
        let receiptMessage = '';

        if (dto.isRecieptNeeded) {
          switch (dto.deliveryChannel) {
            case 'email':
              receiptMessage =
                "Receipt has been generated and sent to the customer's email.";
              break;
            case 'whatsapp':
              receiptMessage =
                'Receipt has been generated and delivered via WhatsApp.';
              break;
            case 'print':
              receiptMessage =
                'Receipt has been generated and is ready for printing.';
              break;
            default:
              receiptMessage = 'Receipt has been generated.';
          }
        } else {
          receiptMessage = 'No receipt was generated for this sale.';
        }

        return {
          message: `Sale created successfully. ${receiptMessage}`,
          saleId: sale.id,
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Request failed. Please try again later',
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
  private async handleRecieptOnEmailDelivery(manager: any, saleId: string) {
    // Get sale + saleitems
    const sale = await manager.findOne(Sale, {
      where: { id: saleId },
      relations: ['saleItems', 'saleItems.productVariant', 'business', 'store'],
    });
    if (!sale) {
      throw new NotFoundException(`Cannot find sale with ${saleId} ID`);
    }
    // Defines a reciept payload
    const reciept = await this.recieptHelper.generateReceipt(sale);

    // Generate a pdf of the reciept and get pdfUrl
    const pdfUrl = await this.recieptPdfHelper.savePdf(reciept, {
      ...sale.store,
      website: sale.business.website,
    });
    // Update sale pdf_url and save
    sale.pdf_url = pdfUrl;
    await manager.save(sale);

    // Render a email template reciept
    const html = this.renderReceiptEmailHtml({
      storeName: sale.store.name,
      customerName: sale.customer_name,
      saleItems: reciept.items,
      netAmount: reciept.netAmount,
      paymentMethod: reciept.paymentMethod,
      pdfUrl,
      supportEmail: sale.store.email,
      storeAddress: sale.store.address,
    });

    // Send reciept pdf url to customer
    const { data, error } = await this.mailService.sendMail(
      sale.customer_email,
      `Thank you for shopping
        at ${sale.store.name}`,
      html,
    );

    if (error) {
      throw new Error(error.message);
    }
  }
  private async deductStockTransactional(manager: any, dto: DeductStockDto) {
    try {
      const key = dto.idempotencyKey || uuidv4();

      // Check if already processed
      const existingLogs = await manager.find(InventoryLog, {
        where: { idempotency_key: key },
      });
      if (existingLogs.length > 0) {
        return {
          message: 'Duplicate request ignored (idempotent)',
          deductions: existingLogs.map((log) => ({
            variantId: log.variant_id,
            deducted: log.change,
            reason: log.reason,
            createdAt: log.created_at,
          })),
          idempotencyKey: key,
        };
      }

      const results: any[] = [];

      for (const deduction of dto.deductions) {
        // 1. Get inventory row
        const inventory = await manager.findOne(StoreInventory, {
          where: {
            store_id: deduction.storeId,
            variant_id: deduction.variantId,
          },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Inventory not found for variant ${deduction.variantId}`,
          );
        }

        // 2. Check stock availability
        if (inventory.quantity < deduction.quantity) {
          throw new BadRequestException(
            `Not enough stock for variant ${deduction.variantId}`,
          );
        }

        // 3. Update stock
        inventory.quantity = inventory.quantity - deduction.quantity;
        await manager.save(inventory);

        // 4. Log deduction
        const log = manager.create(InventoryLog, {
          idempotency_key: key,
          business_id: inventory.business_id,
          inventory_id: inventory.id,
          change: deduction.quantity,
          type: 'deduct',
          reference: deduction.reference,
          created_by: deduction.createdBy,
          store_id: deduction.storeId,
          variant_id: deduction.variantId,
          reason: deduction.reason,
        });
        await manager.save(log);

        // 5. Push result
        results.push({
          variant_id: deduction.variantId,
          deducted: deduction.quantity,
          remaining: inventory.quantity,
        });

        // 6. Low stock alert (optional: save in `stock_alerts`)
        if (inventory.quantity <= inventory.low_stock_quantity) {
          const alert = manager.create(StockAlert, {
            threshold: inventory.low_stock_quantity,
            business_id: inventory.business_id,
            status: 'low stock',
            triggered_at: new Date(),
            inventory_id: inventory.id,
            stock_at_trigger: inventory.quantity,
            store_id: deduction.storeId,
          });
          await manager.save(alert);
        }
      }

      return {
        message: 'Stock deducted successfully',
        deductions: results,
        idempotencyKey: key,
      };
    } catch (error) {
      this.logger.error(`Error in deductStockTransactional: ${error.message}`);
      throw error;
    }
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
          'saleItems',
          'saleItems.productVariant',
          'saleItems.productVariant.product',
        ],
        order: { created_at: 'ASC' },
      });

      // 🔹 Flatten all sale items
      const saleItems = sales.flatMap((sale) =>
        sale.saleItems.map((item) => ({
          saleId: sale.id,
          reference: item.reference,
          customer: sale.customer_name,
          paymentMethod: sale.payment_method,
          createdAt: sale.created_at,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.quantity * item.unit_price,
          productVariant: {
            productName: item.productVariant?.product?.name,
            id: item.productVariant?.id,
            sku: item.productVariant?.sku,
            name: item.productVariant?.name,
            imageUrl: item.productVariant.image_url,
          },
        })),
      );

      // 🔹 Calculate total sales amount
      const totalAmount = saleItems.reduce(
        (sum, item) => sum + item.totalPrice,
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
      storeId: string;
      businessId: string;
      name?: string;
      email?: string;
      phone?: string;
    },
  ) {
    // Try to find existing customer by email/phone within store
    const existing = await manager.findOne(Customer, {
      where: [
        { store_id: customer.storeId, email: customer.email },
        { store_id: customer.storeId, phone: customer.phone },
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
        store_id: customer.storeId,
        business_id: customer.businessId,
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
      store_id: dto.storeId,
      phone: dto.phone,
    });
    await this.customerRepo.save(newCustomer);
    return newCustomer;
  }
  private renderReceiptEmailHtml({
    storeName,
    customerName,
    saleItems,
    netAmount,
    paymentMethod,
    pdfUrl,
    supportEmail,
    storeAddress,
  }: {
    storeName: string;
    customerName: string;
    saleItems: {
      productName: string;
      quantity: number;
      unitPrice: number;
      imageUrl: string;
    }[];
    netAmount: number;
    paymentMethod: string;
    pdfUrl: string;
    supportEmail: string;
    storeAddress: string;
  }) {
    const itemsHtml = saleItems
      .map(
        (item) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f2f5fa; display:flex; align-items:center; gap:8px;">
          <img 
            src="${item.imageUrl}" 
            alt="${item.productName}" 
            style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #eee;" 
          />
          <span>${item.productName}</span>
        </td>
        <td align="center" style="padding:8px 10px;border-bottom:1px solid #f2f5fa">
          ${item.quantity}
        </td>
        <td align="right" style="padding:8px 10px;border-bottom:1px solid #f2f5fa">
          $${item.unitPrice.toFixed(2)}
        </td>
      </tr>
    `,
      )
      .join('');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Your receipt</title>
  </head>
  <body style="margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4f6f8;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:28px auto;border-radius:8px;overflow:hidden;background:#ffffff;border:1px solid #e6e9ef">
      <tr>
        <td style="background:#0b5cff;color:#fff;padding:20px 24px;text-align:center">
          <h1 style="margin:0;font-size:20px;font-weight:600">${storeName}</h1>
          <div style="font-size:13px;opacity:0.95">Official Receipt</div>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0">Hi ${customerName},</p>
          <p style="margin:0 0 18px 0;color:#555">Thanks for your purchase. Your receipt is available below — you can download the official PDF receipt or view it in your browser.</p>

          <!-- Order summary -->
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-top:10px">
            <thead>
              <tr style="background:#f5f7fb;color:#333">
                <th align="left" style="padding:8px 10px;border-bottom:1px solid #eceff5">Item</th>
                <th align="center" style="padding:8px 10px;border-bottom:1px solid #eceff5">Qty</th>
                <th align="right" style="padding:8px 10px;border-bottom:1px solid #eceff5">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="margin:18px 0 6px 0;font-size:16px;font-weight:600">Total:
          $${netAmount.toFixed(2)}</p>
          <p style="margin:0 0 24px 0;color:#666;font-size:13px">Payment:
          ${paymentMethod}</p>

          <!-- Download button -->
          <div style="text-align:center;margin:18px 0 8px 0">
            <a
              href="${pdfUrl}"
              style="display:inline-block;padding:12px 20px;background:#0b5cff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Receipt (PDF)
            </a>
          </div>

          <!-- Fallback link -->
          <div style="text-align:center;margin-top:6px;font-size:13px;color:#666">
            <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" style="color:#0b5cff;text-decoration:none">Or open the receipt in your browser</a>
          </div>

          <hr style="border:none;border-top:1px solid #eef2f7;margin:22px 0"/>

          <p style="margin:0;color:#666;font-size:13px">If you need help,
          contact <a href="mailto:${supportEmail}"
          style="color:#0b5cff">${supportEmail}</a>.</p>
        </td>
      </tr>

      <tr>
        <td style="padding:14px 20px;background:#fbfcfe;color:#8a93a8;text-align:center;font-size:12px">
          <div>${storeName} • ${storeAddress}</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
