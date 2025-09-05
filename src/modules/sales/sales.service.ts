import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { isValidUUID } from '../../utils/id-validator';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly inventoryService: InventoryService,
  ) {}

  async createSale(createSaleDto: CreateSaleDto) {
    try {
      const { storeId, saleDate, sales } = createSaleDto;

      // 1. Validate store ID
      if (!isValidUUID(storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }

      // 2. Check if store exists
      const { data: store, error: storeError } = await this.supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .maybeSingle();

      if (storeError) {
        throw new BadRequestException(
          `Error checking store: ${storeError.message}`,
        );
      }
      if (!store) {
        throw new NotFoundException('Store does not exist');
      }

      const createdSales: any[] = [];

      for (const sale of sales) {
        const {
          idempotencyKey,
          productId,
          inventoryId,
          variantId,
          quantity,
          type,
        } = sale;

        // 3. Validate idempotency key
        if (!idempotencyKey) {
          throw new BadRequestException('idempotencyKey is required');
        }

        // 4. Validate product exists in the store
        const { data: product, error: productError } = await this.supabase
          .from('products')
          .select('id')
          .match({ id: productId, storeId })
          .maybeSingle();

        if (productError) {
          throw new BadRequestException(
            `Error checking product: ${productError.message}`,
          );
        }
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${productId} not found in this store`,
          );
        }

        // 5. Check for duplicate sale using idempotency key
        const { data: existingMovement, error: movementError } =
          await this.supabase
            .from('stock_movements')
            .select('id')
            .eq('idempotencyKey', idempotencyKey)
            .maybeSingle();

        if (movementError) {
          throw new BadRequestException(
            `Error checking stock movement: ${movementError.message}`,
          );
        }
        if (existingMovement) {
          this.logger.warn(`Duplicate sale skipped: ${idempotencyKey}`);
          continue;
        }

        // 6. Create sale record
        const { data: newSale, error: createError } = await this.supabase
          .from('sales')
          .upsert({
            ...sale,
            storeId,
            variantId: variantId,
            customer: sale.customer.name,
            saleDate: new Date(saleDate),
          })
          .select()
          .maybeSingle();

        if (createError) {
          throw new BadRequestException(
            `Error creating sale: ${createError.message}`,
          );
        }

        // 7. Create a customer
        const { data: existsCustomer, error: existsError } = await this.supabase
          .from('customers')
          .select('*')
          .match({
            name: sale.customer.name,
            email: sale.customer.email,
            phoneNumber: sale.customer.phoneNumber,
          })
          .maybeSingle();
        if (existsError) {
          throw new BadRequestException(`Error checking customer:
                  ${existsError.message}`);
        }

        if (!existsCustomer) {
          const { error: customerError } = await this.supabase
            .from('customers')
            .upsert({
              storeId: createSaleDto.storeId,
              name: sale.customer.name,
              email: sale.customer.email,
              phoneNumber: sale.customer.phoneNumber,
            });
          if (customerError) {
            throw new BadRequestException(`Error creating customer:
                      ${customerError.message}`);
          }
        }

        // 8. Adjust stock
        await this.inventoryService.stockMove({
          inventoryId,
          change: -quantity,
          type,
          idempotencyKey,
        });

        createdSales.push(newSale);
      }

      return createdSales;
    } catch (error) {
      this.logger.error(`Error in createSale: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while creating sale record. Please try again later',
      );
    }
  }

  async getSales(
    storeId: string,
    query: {
      limit?: number;
      page?: number;
      startDate?: string;
      endDate?: string;
      search?: string;
      orderBy?: string;
      order?: 'asc' | 'desc';
    },
  ) {
    try {
      const limit = query.limit && query.limit > 0 ? query.limit : 10;
      const page = query.page && query.page > 0 ? query.page : 1;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let supabaseQuery = this.supabase
        .from('sales')
        .select(
          `
          id,
          saleDate,
          quantity,
          pricePerUnit,
          totalPrice,
          customer,
          products (id, name, category),
          variants (id, sku, color, size, weight, dimensions)
        `,
          { count: 'exact' },
        )
        .eq('storeId', storeId);

      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('saleDate', query.startDate);
      }
      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('saleDate', query.endDate);
      }
      if (query.search) {
        supabaseQuery = supabaseQuery.ilike('customer', `%${query.search}%`);
      }
      if (query.orderBy) {
        supabaseQuery = supabaseQuery.order(query.orderBy, {
          ascending: query.order === 'asc',
        });
      } else {
        supabaseQuery = supabaseQuery.order('saleDate', {
          ascending: false,
        });
      }

      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new BadRequestException(`Error fetching sales: ${error.message}`);
      }

      return {
        data,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error in getSales: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'An error occurred while fetching sales data',
      );
    }
  }

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
}
