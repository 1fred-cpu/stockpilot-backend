import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';

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
        select: ['net_amount'], // only fetch totalPrice
        where: {
          store_id: storeId,
          created_at: Between(new Date(currentMonthStart), now),
        },
      });

      const totalSalesCurrentMonth = (currentSales || []).reduce(
        (sum, s) => sum + (s.net_amount || 0),
        0,
      );

      // Last Month Sales

      const lastSales = await this.saleRepo.find({
        select: ['net_amount'], // only fetch totalPrice
        where: {
          id: storeId,
          created_at: Between(new Date(lastMonthStart), new Date(lastMonthEnd)),
        },
      });

      const totalSalesLastMonth = (lastSales || []).reduce(
        (sum, s) => sum + (s.net_amount || 0),
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
        select: ['net_amount', 'created_at'],
      });

      // Group sales by date
      const salesByDate: Record<string, number> = {};

      for (const row of data) {
        const date = new Date(row.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
        salesByDate[date] = (salesByDate[date] || 0) + row.net_amount;
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
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });

      if (!store) {
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );
      }

      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      const data = await this.saleItemRepo
        .createQueryBuilder('saleItem')
        .leftJoin('saleItem.productVariant', 'variant')
        .where('saleItem.store_id = :storeId', { storeId })
        .andWhere('saleItem.created_at BETWEEN :start AND :end', {
          start: firstDayOfMonth,
          end: today,
        })
        .select('variant.name', 'productName')
        .addSelect('variant.image_url', 'imageUrl')
        .addSelect('SUM(saleItem.quantity)', 'totalSales')
        .addSelect('SUM(saleItem.total_price)', 'totalRevenue')
        .groupBy('variant.name')
        .addGroupBy('variant.image_url')
        .orderBy('SUM(saleItem.quantity)', 'DESC')
        .limit(5)
        .getRawMany();

      return data.map((row) => ({
        name: row.productName,
        imageUrl: row.imageUrl,
        sales: Number(row.totalSales),
        revenue: Number(row.totalRevenue),
      }));
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
        select: ['quantity', 'productVariant', 'total_quantity'],
        relations: ['productVariant', 'productVariant.product'],
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
        if (!categoryMap[row.productVariant?.product.category_type]) {
          categoryMap[row.productVariant?.product.category_type] = {
            category: row.productVariant?.product.category_type,
            stock: 0,
            total: 0,
          };
        }
        categoryMap[row.productVariant?.product.category_type].stock +=
          row.quantity || 0;
        categoryMap[row.productVariant?.product.category_type].total +=
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
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
      });
      if (!store) {
        throw new NotFoundException(
          'Cannot find a store with invalid store ID',
        );
      }

      const data = await this.saleItemRepo
        .createQueryBuilder('saleItem')
        .leftJoin('saleItem.productVariant', 'variant')
        .where('saleItem.store_id = :storeId', { storeId })
        .orderBy('saleItem.created_at', 'DESC')
        .take(5)
        .select([
          'saleItem.reference AS reference',
          'saleItem.unit_price AS unit_price',
          'saleItem.quantity AS quantity',
          'saleItem.created_at AS created_at',
          'variant.name AS product_name',
        ])
        .getRawMany();

      if (data.length === 0) return [];

      return data.map((row) => ({
        saleId: row.reference,
        product: row.product_name,
        amount: row.unit_price,
        quantity: row.quantity,
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
        select: ['quantity', 'low_stock_quantity', 'productVariant'],
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

        relations: ['productVariant', 'productVariant.product'],
      });

      if (inventories.length === 0) {
        return [];
      }

      // Build a map of category statuss
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
          i.productVariant.product.category_type || 'Uncategorized';

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
        relations: ['productVariant', 'productVariant.product'],
      });

      if (!inventories.length) {
        return {
          categories: [],
          totals: {
            totalItems: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          },
        };
      }

      // 2. Prepare structures
      const categoryMap: Record<
        string,
        {
          totalItems: number;
          lowStockCount: number;
          outOfStockCount: number;
        }
      > = {};
      const totals = {
        totalItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };

      // 3. Loop through each inventory
      for (const inv of inventories) {
        const category =
          inv.productVariant.product.category_type || 'Uncategorized';

        if (!categoryMap[category]) {
          categoryMap[category] = {
            totalItems: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          };
        }

        // Increment totals
        categoryMap[category].totalItems += 1;
        totals.totalItems += 1;

        if (inv.quantity === 0) {
          categoryMap[category].outOfStockCount += 1;
          totals.outOfStockCount += 1;
        } else if (inv.quantity <= inv.low_stock_quantity) {
          categoryMap[category].lowStockCount += 1;
          totals.lowStockCount += 1;
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
        relations: ['productVariant'], // ensure variant is joined
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

  async getSaleKPIAnalytics(storeId: string) {
    try {
      const now = new Date();

      //  Month ranges
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      //  Week ranges
      const dayOfWeek = now.getDay(); // 0=Sunday
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - dayOfWeek);

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);

      // ------------------------------
      // REVENUE (Current vs Last Month)
      // ------------------------------
      const thisMonthSales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startOfThisMonth, now),
        },
      });

      const lastMonthSales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startOfLastMonth, endOfLastMonth),
        },
      });

      const thisMonthRevenue = thisMonthSales.reduce(
        (sum, s) => sum + Number(s.net_amount),
        0,
      );
      const lastMonthRevenue = lastMonthSales.reduce(
        (sum, s) => sum + Number(s.net_amount),
        0,
      );

      const revenueChange =
        lastMonthRevenue === 0
          ? 0
          : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      // ------------------------------
      // TOTAL SALES (Current vs Last Week)
      // ------------------------------
      const thisWeekSales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startOfThisWeek, now),
        },
      });

      const lastWeekSales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startOfLastWeek, endOfLastWeek),
        },
      });

      const salesChange =
        lastWeekSales.length === 0
          ? 0
          : ((thisWeekSales.length - lastWeekSales.length) /
              lastWeekSales.length) *
            100;

      // ------------------------------
      // AVERAGE SALE VALUE
      // ------------------------------
      const thisWeekRevenue = thisWeekSales.reduce(
        (sum, s) => sum + Number(s.net_amount),
        0,
      );
      const lastWeekRevenue = lastWeekSales.reduce(
        (sum, s) => sum + Number(s.total_amount),
        0,
      );

      const avgSaleValue =
        thisWeekSales.length > 0 ? thisWeekRevenue / thisWeekSales.length : 0;
      const lastAvgSaleValue =
        lastWeekSales.length > 0 ? lastWeekRevenue / lastWeekSales.length : 0;

      const avgChange =
        lastAvgSaleValue === 0
          ? 0
          : ((avgSaleValue - lastAvgSaleValue) / lastAvgSaleValue) * 100;

      return {
        revenue: {
          total: thisMonthRevenue,
          change: revenueChange,
        },
        sales: {
          total: thisWeekSales.length,
          change: salesChange,
        },
        averageSaleValue: {
          value: avgSaleValue,
          change: avgChange,
        },
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getSaleKPIAnalytics ');
    }
  }

  async getWeeklySalesTrend(storeId: string, weeks: number = 6) {
    try {
      const now = new Date();

      // 🔹 Start date (N weeks ago)
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - weeks * 7);
      startDate.setHours(0, 0, 0, 0);

      // 🔹 Fetch sales
      const sales = await this.saleRepo.find({
        where: {
          store_id: storeId,
          created_at: Between(startDate, now),
        },
      });

      if (sales.length === 0) {
        return [];
      }

      // 🔹 Group sales by week number
      const weeklyData: Record<
        string,
        { revenue: number; days: Set<string>; month: string }
      > = {};

      for (const sale of sales) {
        const date = new Date(sale.created_at);

        const weekNumber = this.getISOWeek(date);
        const year = date.getFullYear();
        const weekKey = `${year}-W${weekNumber}`;

        const monthKey = `${year}-${date.getMonth() + 1}`; // e.g., 2025-9

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            revenue: 0,
            days: new Set(),
            month: monthKey,
          };
        }

        weeklyData[weekKey].revenue += Number(sale.net_amount);
        weeklyData[weekKey].days.add(date.toISOString().split('T')[0]);
      }

      // 🔹 Track monthly totals per month
      const monthTotals: Record<string, number> = {};

      const trend = Object.entries(weeklyData)
        .map(([week, values], index) => {
          const weekly = values.revenue;
          const daily =
            values.days.size > 0 ? weekly / values.days.size : weekly;

          if (!monthTotals[values.month]) {
            monthTotals[values.month] = 0;
          }
          monthTotals[values.month] += weekly;

          return {
            date: `Week ${index + 1}`,
            daily: Math.round(daily),
            weekly: Math.round(weekly),
            monthly: Math.round(monthTotals[values.month]),
          };
        })
        .sort(
          (a, b) =>
            parseInt(a.date.replace('Week ', '')) -
            parseInt(b.date.replace('Week ', '')),
        );

      return trend;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getWeeklySalesTrend');
    }
  }

  // 🔹 Helper: Calculate ISO Week Number
  private getISOWeek(date: Date): number {
    const tmpDate = new Date(date.getTime());
    tmpDate.setHours(0, 0, 0, 0);

    // Thursday in current week decides the year
    tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
    const week1 = new Date(tmpDate.getFullYear(), 0, 4);

    return (
      1 +
      Math.round(
        ((tmpDate.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      )
    );
  }
}
