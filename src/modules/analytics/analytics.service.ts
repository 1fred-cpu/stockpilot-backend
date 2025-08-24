import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}

  async getKPIAnalytics(storeId: string) {
    try {
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

      if (currentSalesErr) throw currentSalesErr;

      const totalSalesCurrentMonth = (currentSales || []).reduce(
        (sum, s) => sum + (s.total_amount || 0),
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

      /** Change */
      const percentageChangeProducts =
        ((totalProductsCurrentMonth - totalProductsLastMonth) /
          totalProductsLastMonth) *
        100;

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

      const percentageChangeCustomers =
        ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) *
        100;

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
      console.error('AnalyticsService Error:', error.message || error);
      throw new InternalServerErrorException('Failed to fetch analytics');
    }
  }
}
