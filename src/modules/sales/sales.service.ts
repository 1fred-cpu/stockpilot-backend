import {
    Injectable,
    Inject,
    Logger,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { InventoryService } from "../inventory/inventory.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { generateReference } from "src/utils/generate-reference";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";

@Injectable()
export class SalesService {
    private readonly logger = new Logger(SalesService.name);

    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any,
        private readonly inventoryService: InventoryService,
        private readonly errorHandler: HandleErrorService,
        private readonly eventEmitterHelper: EventEmitterHelper
    ) {}

    // async createSale(createSaleDto: CreateSaleDto) {
    //   try {
    //     const { storeId, saleDate, sales } = createSaleDto;

    //     // 1. Validate store ID
    //     if (!isValidUUID(storeId)) {
    //       throw new BadRequestException('Invalid storeId format');
    //     }

    //     // 2. Check if store exists
    //     const { data: store, error: storeError } = await this.supabase
    //       .from('stores')
    //       .select('id')
    //       .eq('id', storeId)
    //       .maybeSingle();

    //     if (storeError) {
    //       throw new BadRequestException(
    //         `Error checking store: ${storeError.message}`,
    //       );
    //     }
    //     if (!store) {
    //       throw new NotFoundException('Store does not exist');
    //     }

    //     const createdSales: any[] = [];

    //     for (const sale of sales) {
    //       const {
    //         idempotencyKey,
    //         productId,
    //         inventoryId,
    //         variantId,
    //         quantity,
    //         type,
    //       } = sale;

    //       // 3. Validate idempotency key
    //       if (!idempotencyKey) {
    //         throw new BadRequestException('idempotencyKey is required');
    //       }

    //       // 4. Validate product exists in the store
    //       const { data: product, error: productError } = await this.supabase
    //         .from('products')
    //         .select('id')
    //         .match({ id: productId, storeId })
    //         .maybeSingle();

    //       if (productError) {
    //         throw new BadRequestException(
    //           `Error checking product: ${productError.message}`,
    //         );
    //       }
    //       if (!product) {
    //         throw new NotFoundException(
    //           `Product with ID ${productId} not found in this store`,
    //         );
    //       }

    //       // 5. Check for duplicate sale using idempotency key
    //       const { data: existingMovement, error: movementError } =
    //         await this.supabase
    //           .from('stock_movements')
    //           .select('id')
    //           .eq('idempotencyKey', idempotencyKey)
    //           .maybeSingle();

    //       if (movementError) {
    //         throw new BadRequestException(
    //           `Error checking stock movement: ${movementError.message}`,
    //         );
    //       }
    //       if (existingMovement) {
    //         this.logger.warn(`Duplicate sale skipped: ${idempotencyKey}`);
    //         continue;
    //       }

    //       // 6. Create sale record
    //       const { data: newSale, error: createError } = await this.supabase
    //         .from('sales')
    //         .upsert({
    //           ...sale,
    //           storeId,
    //           variantId: variantId,
    //           customer: sale.customer.name,
    //           saleDate: new Date(saleDate),
    //         })
    //         .select()
    //         .maybeSingle();

    //       if (createError) {
    //         throw new BadRequestException(
    //           `Error creating sale: ${createError.message}`,
    //         );
    //       }

    //       // 7. Create a customer
    //       const { data: existsCustomer, error: existsError } = await this.supabase
    //         .from('customers')
    //         .select('*')
    //         .match({
    //           name: sale.customer.name,
    //           email: sale.customer.email,
    //           phoneNumber: sale.customer.phoneNumber,
    //         })
    //         .maybeSingle();
    //       if (existsError) {
    //         throw new BadRequestException(`Error checking customer:
    //                 ${existsError.message}`);
    //       }

    //       if (!existsCustomer) {
    //         const { error: customerError } = await this.supabase
    //           .from('customers')
    //           .upsert({
    //             storeId: createSaleDto.storeId,
    //             name: sale.customer.name,
    //             email: sale.customer.email,
    //             phoneNumber: sale.customer.phoneNumber,
    //           });
    //         if (customerError) {
    //           throw new BadRequestException(`Error creating customer:
    //                     ${customerError.message}`);
    //         }
    //       }

    //       // 8. Adjust stock
    //       await this.inventoryService.stockMove({
    //         inventoryId,
    //         change: -quantity,
    //         type,
    //         idempotencyKey,
    //       });

    //       createdSales.push(newSale);
    //     }

    //     return createdSales;
    //   } catch (error) {
    //     this.logger.error(`Error in createSale: ${error.message}`);
    //     if (
    //       error instanceof BadRequestException ||
    //       error instanceof NotFoundException
    //     ) {
    //       throw error;
    //     }
    //     throw new InternalServerErrorException(
    //       'An error occurred while creating sale record. Please try again later',
    //     );
    //   }
    // }

    async getSales(
        storeId: string,
        query: {
            limit?: number;
            page?: number;
            startDate?: string;
            endDate?: string;
            search?: string;
            orderBy?: string;
            order?: "asc" | "desc";
        }
    ) {
        try {
            const limit = query.limit && query.limit > 0 ? query.limit : 10;
            const page = query.page && query.page > 0 ? query.page : 1;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let supabaseQuery = this.supabase
                .from("sales")
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
                    { count: "exact" }
                )
                .eq("storeId", storeId);

            if (query.startDate) {
                supabaseQuery = supabaseQuery.gte("saleDate", query.startDate);
            }
            if (query.endDate) {
                supabaseQuery = supabaseQuery.lte("saleDate", query.endDate);
            }
            if (query.search) {
                supabaseQuery = supabaseQuery.ilike(
                    "customer",
                    `%${query.search}%`
                );
            }
            if (query.orderBy) {
                supabaseQuery = supabaseQuery.order(query.orderBy, {
                    ascending: query.order === "asc"
                });
            } else {
                supabaseQuery = supabaseQuery.order("saleDate", {
                    ascending: false
                });
            }

            supabaseQuery = supabaseQuery.range(from, to);

            const { data, error, count } = await supabaseQuery;

            if (error) {
                throw new BadRequestException(
                    `Error fetching sales: ${error.message}`
                );
            }

            return {
                data,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        } catch (error) {
            this.logger.error(`Error in getSales: ${error.message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(
                "An error occurred while fetching sales data"
            );
        }
    }

    async getAnalytics(storeId: string, startDate?: string, endDate?: string) {
        try {
            if (!storeId) {
                throw new BadRequestException("storeId is required");
            }

            const dateRange = {
                gte: startDate || "1900-01-01",
                lte: endDate || new Date().toISOString()
            };

            // 1. KPIs
            const { data: salesData, error: salesError } = await this.supabase
                .from("sales")
                .select("totalPrice")
                .eq("storeId", storeId)
                .gte("saleDate", dateRange.gte)
                .lte("saleDate", dateRange.lte);

            if (salesError) throw new BadRequestException(salesError.message);

            const totalSales = salesData.length;
            const totalRevenue = salesData.reduce(
                (sum, s) => sum + (s.totalPrice || 0),
                0
            );
            const avgOrderValue =
                totalSales > 0 ? totalRevenue / totalSales : 0;

            // 2. Sales over time
            const { data: timelineData, error: timelineError } =
                await this.supabase
                    .from("sales")
                    .select("saleDate, totalPrice")
                    .eq("storeId", storeId)
                    .gte("saleDate", dateRange.gte)
                    .lte("saleDate", dateRange.lte)
                    .order("saleDate", { ascending: true });

            if (timelineError)
                throw new BadRequestException(timelineError.message);

            const salesByDate: Record<
                string,
                { totalSales: number; totalRevenue: number }
            > = {};
            timelineData.forEach(row => {
                const date = row.saleDate.split("T")[0];
                if (!salesByDate[date]) {
                    salesByDate[date] = { totalSales: 0, totalRevenue: 0 };
                }
                salesByDate[date].totalSales += 1;
                salesByDate[date].totalRevenue += row.totalPrice || 0;
            });

            // 3. Top products
            const { data: topProductsData, error: topProductsError } =
                await this.supabase
                    .from("sales")
                    .select(`productId, quantity, totalPrice, products(name)`)
                    .eq("storeId", storeId)
                    .gte("saleDate", dateRange.gte)
                    .lte("saleDate", dateRange.lte);

            if (topProductsError)
                throw new BadRequestException(topProductsError.message);

            const productStats: Record<
                string,
                { name: string; unitsSold: number; totalRevenue: number }
            > = {};
            topProductsData.forEach(row => {
                const name = row.products?.name || "Unknown Product";
                if (!productStats[name]) {
                    productStats[name] = {
                        name,
                        unitsSold: 0,
                        totalRevenue: 0
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
                    topProduct: topProducts[0] || null
                },
                salesOverTime: Object.entries(salesByDate).map(
                    ([date, stats]) => ({
                        date,
                        totalSales: stats.totalSales,
                        totalRevenue: stats.totalRevenue
                    })
                ),
                topProducts
            };
        } catch (error) {
            this.logger.error(`Error in getAnalytics: ${error.message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(
                "An error occurred while fetching sales analytics"
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
            // Check if store exists
            const store = await this.findStore(dto.store_id);

            if (!store) {
                throw new NotFoundException("Store not found");
            }

            // 🔹 Check if already processed (idempotency)
            const { data: existingLog, error: logError } = await this.supabase
                .from("inventory_logs")
                .select("*")
                .eq("idempotency_key", dto.idempotency_key)
                .maybeSingle();

            if (logError) {
                throw new BadRequestException(logError.message);
            }

            if (existingLog) {
                return {
                    message: "Duplicate request ignored (idempotent)",
                    reference: existingLog.reference,
                    idempotency_key: existingLog.idempotency_key
                };
            }
            // Insert customer data when provided
            if (dto.customer) {
                await this.createCustomer({
                    email: dto.customer?.email,
                    name: dto.customer?.name,
                    phone: dto.customer?.phone,
                    store_id: dto.store_id
                });
            }
            // Insert sale data
            const { data: sale, error } = await this.supabase
                .from("sales")
                .insert([
                    {
                        id: uuidv4(),
                        store_id: dto.store_id,
                        business_id: dto.business_id,
                        total_amount: dto.total_amount,
                        net_amount: dto.total_amount,
                        payment_status: "paid",
                        payment_method: dto.payment_method || "cash",
                        created_by: dto.created_by,
                        customer_email: dto.customer?.email || null,
                        customer_phone: dto.customer?.phone || null,
                        customer_name: dto.customer?.name || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .maybeSingle();

            if (error) throw new BadRequestException(error.message);

            const saleItems: any[] = [];
            const deductions: any[] = [];

            for (const item of dto.items) {
                // Insert sale item
                const { data, error } = await this.supabase
                    .from("sale_items")
                    .insert([{
                        id: uuidv4(),
                        sale_id: sale.id,
                        variant_id: item.variant_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        discount: item.discount || 0,
                        total_price:
                            item.unit_price * item.quantity -
                            (item.discount || 0)
                    }])
                    .select("*,product_variants(id,name,image_url,sku)")
                    .maybeSingle();

                if (error) {
                    throw new BadRequestException(error.message);
                }

                if (data) {
                    saleItems.push(data);

                    deductions.push({
                        store_id: dto.store_id,
                        variant_id: item.variant_id,
                        quantity: item.quantity,
                        reason: "sale",
                        reference: generateReference("SALE"),
                        created_by: dto.created_by
                    });
                }
            }

            // Deduct stock in inventory
            await this.inventoryService.deductStock({
                deductions,
                idempotency_key: dto.idempotency_key || undefined
            });

            // Emit a SaleCreated event
            await this.eventEmitterHelper.emitEvent(
                "sales.events",
                dto.store_id,
                "SaleCreated",
                { ...sale, items: saleItems }
            );

            return { message: "Sale created", sale_id: sale.id };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "createSales");
        }
    }

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
        reference: string
    ) {
        const { error } = await this.supabase.from("payments").insert({
            id: uuidv4(),
            sale_id: saleId,
            method,
            amount,
            reference,
            status: "completed",
            created_at: new Date().toISOString()
        });

        if (error) throw new BadRequestException(error.message);

        await this.supabase
            .from("sales")
            .update({ payment_status: "paid" })
            .eq("id", saleId);
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
        createdBy: string
    ) {
        const { error } = await this.supabase.from("refunds").insert({
            id: crypto.randomUUID(),
            sale_id: saleId,
            variant_id: variantId,
            quantity,
            refund_amount: 0, // calculate later
            reason,
            created_by: createdBy,
            created_at: new Date().toISOString()
        });

        if (error) throw new BadRequestException(error.message);
    }

    /**
     *
     * @param storeId
     * @returns
     */
    private async findStore(storeId: string) {
        const { data: store, error } = await this.supabase
            .from("stores")
            .select("*")
            .eq("id", storeId)
            .maybeSingle();

        if (error) {
            throw new BadRequestException(error.message);
        }

        return store;
    }
    /** 
  @param dto
 */
    private async createCustomer(dto: any) {
        // 1. Check customer exists
        const { data: existingCustomer, error: fetchError } =
            await this.supabase
                .from("customers")
                .select("*")
                .eq("email", dto.email)
                .maybeSingle();
        if (fetchError) {
            throw new BadRequestException(fetchError.message);
        }

        if (existingCustomer) {
            return existingCustomer;
        }

        // 2. Create customer if not exists
        const { data: newCustomer, error: createError } = await this.supabase
            .from("customers")
            .insert([
                {
                    id: uuidv4(),
                    name: dto.name,
                    email: dto.email,
                    store_id: dto.store_id,
                    phone: dto.phone
                }
            ])
            .select()
            .maybeSingle();
        if (createError) {
            throw new BadRequestException(createError.message);
        }

        return newCustomer;
    }
}
