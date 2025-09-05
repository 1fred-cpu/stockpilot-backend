import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { isValidUUID } from '../../utils/id-validator';
@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);
  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}

  async getKPIAnalytics(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }

      // Check if storeId exist with a store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException('Error fetching store', fetchError);
      }

      if (!store) {
        throw new NotFoundException('storeId does not exists with a store');
      }
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
      const { data: currentSales, error: currentSalesErr } = await this.supabase
        .from('sales')
        .select('totalPrice')
        .eq('storeId', storeId)
        .gte('createdAt', currentMonthStart)
        .lte('createdAt', now.toISOString());

      if (currentSalesErr) {
        throw currentSalesErr;
      }

      const totalSalesCurrentMonth = (currentSales || []).reduce(
        (sum, s) => sum + (s.totalPrice || 0),
        0,
      );

      // Last Month Sales
      const { data: lastSales, error: lastSalesErr } = await this.supabase
        .from('sales')
        .select('totalPrice')
        .eq('storeId', storeId)
        .gte('createdAt', lastMonthStart)
        .lte('createdAt', lastMonthEnd);

      if (lastSalesErr) throw lastSalesErr;

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
      const { count: totalProducts, error: productErr } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('storeId', storeId);

      if (productErr) throw productErr;

      /** Current Month Products */
      const {
        count: totalProductsCurrentMonth,
        error: currentMonthProductErr,
      } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('storeId', storeId)
        .gte('createdAt', currentMonthStart)
        .lte('createdAt', now.toISOString());

      if (currentMonthProductErr) throw currentMonthProductErr;

      /** Last Month Products */
      const { data: totalProductsLastMonth, error: lastMonthProductErr } =
        await this.supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('storeId', storeId)
          .gte('createdAt', lastMonthStart)
          .lte('createdAt', lastMonthEnd);

      if (lastMonthProductErr) throw lastMonthProductErr;

      /** %Change */
      let percentageChangeProducts = 0;

      if (totalProductsLastMonth > 0) {
        percentageChangeProducts =
          ((totalProductsCurrentMonth - totalProductsLastMonth) /
            totalProductsLastMonth) *
          100;
      }

      // Low Stock Products (threshold = 5 units, or use column if available)
      const { count: lowStockProducts, error: lowStockErr } =
        await this.supabase
          .from('inventories')
          .select('*', { count: 'exact', head: true })
          .eq('storeId', storeId)
          .lte('stock', 5);

      if (lowStockErr) throw lowStockErr;

      /** ---------------- CUSTOMERS ---------------- */
      const { count: currentMonthCustomers, error: currentMonthCustomerErr } =
        await this.supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('storeId', storeId)
          .gte('createdAt', currentMonthStart)
          .lte('createdAt', now.toISOString());

      if (currentMonthCustomerErr) throw currentMonthCustomerErr;

      const { count: lastMonthCustomers, error: lastMonthCustomerErr } =
        await this.supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('storeId', storeId)
          .gte('createdAt', lastMonthStart)
          .lte('createdAt', lastMonthEnd);

      if (lastMonthCustomerErr) throw lastMonthCustomerErr;

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
      if (error instanceof NotFoundException || BadRequestException) {
        throw error;
      }
      this.logger.error('Error fetching KPI analytics', error);
      throw new InternalServerErrorException('Failed to fetch KPI analytics');
    }
  }

  async getSalesTrendLast30days(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }
      // Check if storeId exist with a store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException('Error fetching store', fetchError);
      }

      if (!store) {
        throw new NotFoundException('storeId does not exists with a store');
      }

      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - 30);

      // Query sales from Supabase
      const { data, error } = await this.supabase
        .from('sales')
        .select('totalPrice, createdAt')
        .eq('storeId', storeId)
        .gte('createdAt', startDate.toISOString())
        .lte('createdAt', today.toISOString());

      if (error) throw new BadRequestException(error.message);

      // Group sales by date
      const salesByDate: Record<string, number> = {};

      for (const row of data) {
        const date = new Date(row.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        salesByDate[date] = (salesByDate[date] || 0) + row.totalPrice;
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
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching Sales Trend Last 30 days analytics: ${error}`,
      );
      throw new InternalServerErrorException(
        'Failed to fetch Sales Trend Last 30 days analytics',
      );
    }
  }

  async getTopSellingProducts(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }

      // Check if storeId exist with a store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException('Error fetching store', fetchError);
      }

      if (!store) {
        throw new NotFoundException('storeId does not exists with a store');
      }
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      // Fetch current month sales
      const { data, error } = await this.supabase
        .from('sales')
        .select('productId, products(name), quantity, totalPrice, createdAt')
        .eq('storeId', storeId)
        .gte('createdAt', firstDayOfMonth.toISOString())
        .lte('createdAt', today.toISOString())
        .limit(5);

      if (error) throw new BadRequestException(error.message);

      if (data.length === 0) {
        return [];
      }

      // Aggregate by product
      const productMap: Record<
        string,
        { name: string; sales: number; revenue: number }
      > = {};

      for (const row of data) {
        if (!productMap[row.products.name]) {
          productMap[row.products.name] = {
            name: row.products.name,
            sales: 0,
            revenue: 0,
          };
        }
        productMap[row.products.name].sales += row.quantity;
        productMap[row.products.name].revenue += row.totalPrice;
      }

      // Sort by units sold (desc)
      const result = Object.values(productMap).sort(
        (a, b) => b.sales - a.sales,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching Top Selling Products: ${error}`);
      throw new InternalServerErrorException(
        'Failed to fetch Top Selling Products analytics',
      );
    }
  }

  async getInventoryStatusByCategory(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }
      // Check if storeId exist with a store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException('Error fetching store', fetchError);
      }

      if (!store) {
        throw new NotFoundException('storeId does not exists with a store');
      }

      const { data, error } = await this.supabase
        .from('inventories')
        .select('productId, products(categories(name)), stock, totalStock')
        .eq('storeId', storeId);

      if (error) {
        throw new BadRequestException(`Supabase error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Aggregate stock and total by category
      const categoryMap: Record<
        string,
        { category: string; stock: number; total: number }
      > = {};

      for (const row of data) {
        if (!categoryMap[row.products.categories.name]) {
          categoryMap[row.products.categories.name] = {
            category: row.products.categories.name,
            stock: 0,
            total: 0,
          };
        }
        categoryMap[row.products.categories.name].stock += row.stock || 0;
        categoryMap[row.products.categories.name].total += row.totalStock || 0;
      }

      return Object.values(categoryMap);
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }

      this.logger.error(`Error fetching inventory data: ${error}`);
      throw new InternalServerErrorException(
        'Failed to fetch inventory status analytics',
      );
    }
  }
  async getLatestSales(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }

      // Check if storeId exist with a store
      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException('Error fetching store', fetchError);
      }

      if (!store) {
        throw new NotFoundException('storeId does not exists with a store');
      }
      const { data, error } = await this.supabase
        .from('sales')
        .select(
          'id, productId, products(name), pricePerUnit, status, createdAt',
        )
        .eq('storeId', storeId)
        .order('createdAt', { ascending: false })
        .limit(10); // get latest 10 sales

      if (error) {
        throw new BadRequestException(`Supabase error: ${error.message}`);
      }

      console.log(data);

      if (!data || data.length === 0) {
        return [];
      }

      // Shape response
      return data.map((row) => ({
        saleId: `SALE-${row.id.slice(0, 4)}`,
        product: row.products?.name,
        amount: row.pricePerUnit,
        status: row.status,
      }));
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }

      this.logger.error(`Error fetching latest sales data: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch latest sales analytics',
      );
    }
  }

  async getInventorySummary(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid format of storeId');
      }
      // Fetch variants joined with products to filter by storeId
      const { data: variants, error } = await this.supabase
        .from('variants')
        .select('id, inventories(stock, lowStockThreshold), productId')
        .eq('storeId', storeId);

      if (error) {
        throw new BadRequestException('Supabase Error ' + error.message);
      }
      console.log(variants);

      if (variants.length === 0) {
        return {
          totalItems: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        };
      }

      // Calculate counts based on variant stock
      const totalItems = variants.reduce(
        (sum, v) => sum + v.inventories.stock,
        0,
      );
      const lowStockCount = variants.filter(
        (v) =>
          v.inventories.stock > 0 &&
          v.inventories.stock <= v.inventories.lowStockThreshold,
      ).length;
      const outOfStockCount = variants.filter(
        (v) => v.inventories.stock === 0,
      ).length;

      return {
        totalItems,
        lowStockCount,
        outOfStockCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error fetching inventory summary data:
            ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch inventory summary: ' + error.message,
      );
    }
  }

  async getStockLevelsByCategory(storeId: string) {
    try {
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid format of storeId');
      }
      // Fetch variants with their product + category
      const { data: inventories, error } = await this.supabase
        .from('inventories')
        .select(
          `
          stock,
          products!inner (
            categories(name)
          )
        `,
        )
        .eq('storeId', storeId);

      if (error) {
        throw new BadRequestException('Supabase Error ' + error.message);
      }

      if (!inventories || inventories.length === 0) {
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
        const categoryName = i.products.categories?.name || 'Uncategorized';

        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            category: categoryName,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          };
        }

        if (i.stock > 5) {
          categoryMap[categoryName].inStock += 1;
        } else if (i.stock > 0 && i.stock <= 5) {
          categoryMap[categoryName].lowStock += 1;
        } else if (i.stock === 0) {
          categoryMap[categoryName].outOfStock += 1;
        }
      }

      return Object.values(categoryMap);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch stock levels by category: ' + error.message,
      );
    }
  }
}
