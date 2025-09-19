import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { isValidUUID } from '../../utils/id-validator';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { Sale } from 'src/entities/sale.entity';
import { Product } from 'src/entities/product.entity';
import { StoreInventory } from 'src/entities/store-inventory.entity';
import { Customer } from 'src/entities/customer.entity';
import { SaleItem } from 'src/entities/sale-item.entity';

@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly errorHandler: HandleErrorService,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(StoreInventory)
    private readonly inventoryRepo: Repository<StoreInventory>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
  ) {}

  async getKPIAnalytics(storeId: string) {
    try {
      // 1. Check if store exist
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      const now = new Date();
      const currentMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const lastMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      ).toISOString();
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
      ).toISOString();

      /** ---------------- SALES ---------------- */
      // Current Month Sales

      const currentSales = await this.saleRepo.find({
        select: ['total_amount'], // only fetch totalPrice
        where: {
          id: storeId,
          created_at: Between(new Date(currentMonthStart), now),
        },
      });

      const totalSalesCurrentMonth = (currentSales || []).reduce(
        (sum, s) => sum + (s.total_amount || 0),
        0,
      );

      // Last Month Sales

      const lastSales = await this.saleRepo.find({
        select: ['total_amount'], // only fetch totalPrice
        where: {
          id: storeId,
          created_at: Between(new Date(lastMonthStart), new Date(lastMonthEnd)),
        },
      });

      const totalSalesLastMonth = (lastSales || []).reduce(
        (sum, s) => sum + (s.total_amount || 0),
        0,
      );

      // % Change
      let percentageChange = 0;
      if (totalSalesLastMonth > 0) {
        percentageChange =
          ((totalSalesCurrentMonth - totalSalesLastMonth) /
            totalSalesLastMonth) *
          100;
      }

      /** ---------------- PRODUCTS ---------------- */
      const totalProducts = await this.productRepo.count({
        where: { business_id: store.business_id },
      });

      /** Current Month Products */

      const totalProductsCurrentMonth = await this.productRepo.count({
        where: {
          business_id: store.business_id,
          created_at: Between(new Date(currentMonthStart), now),
        },
      });

      /** Last Month Products */
      const totalProductsLastMonth = await this.productRepo.count({
        where: {
          business_id: store.business_id,
          created_at: Between(new Date(lastMonthStart), new Date(lastMonthEnd)),
        },
      });
      console.log(`lastProductsCurrentMonth: ${totalProducts}`);

      /** %Change */
      let percentageChangeProducts = 0;

      if (totalProductsLastMonth > 0) {
        percentageChangeProducts =
          ((totalProductsCurrentMonth - totalProductsLastMonth) /
            totalProductsLastMonth) *
          100;
      }

      // Low Stock Products (threshold = 5 units, or use column if available)
      const lowStockProducts = await this.inventoryRepo.count({
        where: {
          store_id: storeId,
          quantity: LessThanOrEqual(5),
        },
      });

      /** ---------------- CUSTOMERS ---------------- */
      const currentMonthCustomers = await this.customerRepo.count({
        where: {
          store_id: storeId,
          created_at: Between(new Date(currentMonthStart), now),
        },
      });

      const lastMonthCustomers = await this.customerRepo.count({
        where: {
          store_id: storeId,
          created_at: Between(new Date(lastMonthStart), new Date(lastMonthEnd)),
        },
      });

      /** % change */

      let percentageChangeCustomers = 0;
      if (lastMonthCustomers > 0) {
        percentageChangeCustomers =
          ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) *
          100;
      }

      return {
        sales: {
          currentMonth: totalSalesCurrentMonth,
          lastMonth: totalSalesLastMonth,
          percentageChange: percentageChange.toFixed(2),
        },
        products: {
          total: totalProducts || 0,
          lowStock: lowStockProducts || 0,
          percentageChange: percentageChangeProducts.toFixed(2),
        },
        customers: {
          new: currentMonthCustomers || 0,
          percentageChange: percentageChangeCustomers.toFixed(2),
        },
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getKPIAnalytics');
    }
  }

  async getSalesTrendLast30days(storeId: string) {
    try {
      // Check if storeId exist with a store
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - 30);

      // Query sales from Supabase
      const data = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startDate, today),
        },
        select: ['total_amount', 'created_at'],
      });

      // Group sales by date
      const salesByDate: Record<string, number> = {};

      for (const row of data) {
        const date = new Date(row.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
        salesByDate[date] = (salesByDate[date] || 0) + row.total_amount;
      }

      // Ensure all last 30 days are included (even if sales = 0)
      const result: { date: string; sales: number }[] = [];
      for (let i = 0; i <= 30; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          sales: salesByDate[dateStr] || 0,
        });
      }

      return result;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getSalesTrendLast30Days');
    }
  }

  async getTopSellingProducts(storeId: string) {
    try {
      // Check if storeId exist with a store
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      // Fetch current month sales
      const data = await this.saleItemRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(firstDayOfMonth, today),
        },
        select: ['product_variant', 'quantity', 'total_price', 'created_at'],
        take: 5, // limit to 5 rows
        order: {
          created_at: 'DESC', // optional: latest 5
        },
      });

      if (data.length === 0) {
        return [];
      }

      // Aggregate by product
      const productMap: Record<
        string,
        { name: string; sales: number; revenue: number }
      > = {};

      for (const row of data) {
        if (!productMap[row.product_variant.name]) {
          productMap[row.product_variant.name] = {
            name: row.product_variant.name,
            sales: 0,
            revenue: 0,
          };
        }
        productMap[row.product_variant.name].sales += row.quantity;
        productMap[row.product_variant.name].revenue += row.total_price;
      }

      // Sort by units sold (desc)
      const result = Object.values(productMap).sort(
        (a, b) => b.sales - a.sales,
      );

      return result;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getTopSellingProducts');
    }
  }

  async getInventoryStatusByCategory(storeId: string) {
    try {
      // Check if storeId exist with a store
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      const data = await this.inventoryRepo.find({
        where: {
          store_id: storeId,
        },
        select: ['quantity', 'product_variant', 'total_quantity'],
      });

      if (!data || data.length === 0) {
        return [];
      }

      // Aggregate stock and total by category
      const categoryMap: Record<
        string,
        { category: string; stock: number; total: number }
      > = {};

      for (const row of data) {
        if (!categoryMap[row.product_variant.product.category_type]) {
          categoryMap[row.product_variant.product.category_type] = {
            category: row.product_variant.product.category_type,
            stock: 0,
            total: 0,
          };
        }
        categoryMap[row.product_variant.product.category_type].stock +=
          row.quantity || 0;
        categoryMap[row.product_variant.product.category_type].total +=
          row.total_quantity || 0;
      }

      return Object.values(categoryMap);
    } catch (error) {
      this.errorHandler.handleServiceError(
        error,
        'getInventoryStatusByCategory',
      );
    }
  }
  async getLatestSales(storeId: string) {
    try {
      // Check if storeId exist with a store
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      const data = await this.saleItemRepo.find({
        where: { store_id: storeId },
        select: ['product_variant', 'unit_price', 'created_at', 'reference'],
        take: 5,
        order: {
          created_at: 'DESC',
        },
      });

      if (data.length === 0) {
        return [];
      }

      // Shape response
      return data.map((row) => ({
        saleId: row.reference,
        product: row.product_variant.name,
        amount: row.unit_price,
        status: 'lowStock',
      }));
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getLatestSales');
    }
  }

  async getInventorySummary(storeId: string) {
    try {
      // Check if storeId exist with a store
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      // Fetch variants joined with products to filter by storeId

      const inventories = await this.inventoryRepo.find({
        where: { store_id: storeId },
        select: ['quantity', 'low_stock_quantity', 'product_variant'],
      });
      if (inventories.length === 0) {
        return {
          totalItems: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        };
      }

      // Calculate counts based on variant stock
      const totalItems = inventories.reduce((sum, v) => sum + v.quantity, 0);
      const lowStockCount = inventories.filter(
        (v) => v.quantity > 0 && v.quantity <= v.low_stock_quantity,
      ).length;
      const outOfStockCount = inventories.filter(
        (v) => v.quantity === 0,
      ).length;

      return {
        totalItems,
        lowStockCount,
        outOfStockCount,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getInventorySummary');
    }
  }

  async getStockLevelsByCategory(storeId: string) {
    try {
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store)
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );

      // Fetch variants with their product + category

      const inventories = await this.inventoryRepo.find({
        where: { store_id: storeId },
        select: ['quantity', 'product_variant'],
      });

      if (inventories.length === 0) {
        return [];
      }

      // Build a map of category stats
      const categoryMap: Record<
        string,
        {
          category: string;
          inStock: number;
          lowStock: number;
          outOfStock: number;
        }
      > = {};

      for (const i of inventories) {
        const categoryName =
          i.product_variant.product.category_type || 'Uncategorized';

        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            category: categoryName,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          };
        }

        if (i.quantity > 5) {
          categoryMap[categoryName].inStock += 1;
        } else if (i.quantity > 0 && i.quantity <= 5) {
          categoryMap[categoryName].lowStock += 1;
        } else if (i.quantity === 0) {
          categoryMap[categoryName].outOfStock += 1;
        }
      }

      return Object.values(categoryMap);
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getStockLevelsByCategory');
    }
  }

  async getInventoryKPIAnalytics(storeId: string) {
    try {
      // 1. Load inventories with variant + product
      const inventories = await this.inventoryRepo.find({
        where: { store_id: storeId },
        relations: ['product_variant', 'product_variant.product'],
      });

      if (!inventories.length) {
        return {
          categories: [],
          totals: {
            total_items: 0,
            low_stock_count: 0,
            out_of_stock_count: 0,
          },
        };
      }

      // 2. Prepare structures
      const categoryMap: Record<
        string,
        {
          total_items: number;
          low_stock_count: number;
          out_of_stock_count: number;
        }
      > = {};
      const totals = {
        total_items: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      };

      // 3. Loop through each inventory
      for (const inv of inventories) {
        const category =
          inv.product_variant.product.category_type || 'Uncategorized';

        if (!categoryMap[category]) {
          categoryMap[category] = {
            total_items: 0,
            low_stock_count: 0,
            out_of_stock_count: 0,
          };
        }

        // Increment totals
        categoryMap[category].total_items += 1;
        totals.total_items += 1;

        if (inv.quantity === 0) {
          categoryMap[category].out_of_stock_count += 1;
          totals.out_of_stock_count += 1;
        } else if (inv.quantity <= inv.low_stock_quantity) {
          categoryMap[category].low_stock_count += 1;
          totals.low_stock_count += 1;
        }
      }

      // 4. Format result
      const categories = Object.entries(categoryMap).map(
        ([category, data]) => ({
          category,
          ...data,
        }),
      );

      return { categories, totals };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getInventoryKPIAnalytics');
    }
  }

  async getInventoryDistribution(storeId: string) {
    try {
      // Fetch inventory with product variants
      const inventories = await this.inventoryRepo.find({
        where: { store_id: storeId },
        relations: ['product_variant'], // ensure variant is joined
      });

      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;

      for (const inventory of inventories) {
        const quantity = inventory.quantity ?? 0;
        const lowStockThreshold = inventory.low_stock_quantity ?? 0;

        if (quantity === 0) {
          outOfStock++;
        } else if (quantity > 0 && quantity < lowStockThreshold) {
          lowStock++;
        } else {
          inStock++;
        }
      }

      const pieData = [
        { name: 'In Stock', value: inStock, color: '#10B981' },
        { name: 'Low Stock', value: lowStock, color: '#FBBF24' },
        { name: 'Out of Stock', value: outOfStock, color: '#EF4444' },
      ];

      return pieData;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getInventoryDistribution');
    }
  }
}
