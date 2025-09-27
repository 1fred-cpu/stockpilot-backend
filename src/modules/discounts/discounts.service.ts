import {
  Injectable,
  Logger,
  Inject,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { Discount } from '../../entities/discount.entity';
import { DataSource, EntityManager } from 'typeorm';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
@Injectable()
export class DiscountsService {
  private logger = new Logger(DiscountsService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly dataSource: DataSource,
    private readonly errorHandler: HandleErrorService,
  ) {}

  async createDiscount(dto: CreateDiscountDto) {
    try {
      return await this.dataSource.transaction(async (manager: any) => {
        // 1. Check if discount exists
        const existingDiscount = await manager.findOne(Discount, {
          where: {
            name: dto.name,
            store_id: dto.storeId,
          },
        });

        if (existingDiscount) {
          throw new ConflictException(
            'Discount with this credentials already exists',
          );
        }

        // 2. Create discount if not found
        const discount = manager.create(Discount, {
          store_id: dto.storeId,
          is_active: dto.isActive || false,
          name: dto.name,
          type: dto.type,
          discount_type: dto.discountType,
          value: dto.value,
          product_id: dto.productId || null,
          category_id: dto.categoryId || null,
          min_order_amount: dto.minOrderAmount || 0,
          start_date: new Date(dto.startDate),
          end_date: new Date(dto.endDate),
        });

        return {
          discount,
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createDiscount');
    }
  }
  async findAllDiscounts(storeId: string) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        // 1. Fetch discounts + relations
        const discounts = await manager.find(Discount, {
          where: { store: { id: storeId } },
          relations: ['store', 'products'],
        });

        if (!discounts || discounts.length === 0) {
          throw new NotFoundException('No discounts data found');
        }

        return discounts;
      } catch (error) {
        this.errorHandler.handleServiceError(error, 'findAllDiscounts');
      }
    });
  }
  async findDiscount(discountId: string) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        // 1. Find discount by ID with store + products
        const discount = await manager.findOne(Discount, {
          where: { id: discountId },
          relations: ['store', 'products'], // adjust based on your entity setup
        });

        if (!discount) {
          throw new NotFoundException('No discount data found');
        }

        return discount;
      } catch (error) {
        this.errorHandler.handleServiceError(error, 'findDiscount');
      }
    });
  }

  // async updateDiscount(discountId: string, dto: UpdateDiscountDto) {
  //   return this.dataSource.transaction(async (manager: EntityManager) => {
  //     try {
  //       // 2. Find the discount first
  //       const discount = await manager.findOne(Discount, {
  //         where: { id: discountId },
  //       });

  //       if (!discount) {
  //         throw new NotFoundException('Discount data not found');
  //       }

  //       // 3. Merge updates
  //       const payload: Partial<Discount> = {
  //         name: dto.name ?? discount.name,
  //         type: dto.type ?? discount.type,
  //         discount_type: dto.discountType ?? discount.discount_type,
  //         value: dto.discountType ?? discount.discount_type,
  //       };
  //       manager.merge(Discount, discount, {
  //         name: dto.name || discount.name,
  //         type: dto.name || discount.type,
  //         name: dto.name || discount.name,
  //         name: dto.name || discount.name,
  //         name: dto.name || discount.name,
  //         updated_at: new Date(), // keep updatedAt fresh
  //       });

  //       // 4. Save updated discount
  //       const updatedDiscount = await manager.save(Discount, discount);

  //       // 5. Return updated discount
  //       return updatedDiscount;
  //     } catch (error) {
  //       this.errorHandler.handleServiceError(error, 'updateDiscount');
  //     }
  //   });
  // }

  async deleteDiscount(discountId: string) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        // 1. Find the discount
        const discount = await manager.findOne(Discount, {
          where: { id: discountId },
          relations: ['store', 'products'], // include relations if you want details
        });

        if (!discount) {
          throw new NotFoundException('Discount data not found');
        }

        // 3. Remove discount
        await manager.remove(Discount, discount);

        // 4. Return deleted discount data (snapshot before removal)
        return discount;
      } catch (error) {
        this.errorHandler.handleServiceError(error, 'deleteDiscount');
      }
    });
  }

  /**
   * Apply discounts to products with variants.
   * @param storeId string
   * @param products Array of products { id, categoryId, variants: [{ id, price }] }
   */
  // async applyDiscounts(
  //   storeId: string,
  //   products: any[],
  // ): Promise<any[] | undefined> {
  //   try {
  //     const now = new Date();

  //     // 1. Fetch all active discounts for the store
  //     const { data: discounts, error } = await this.supabase
  //       .from('discounts')
  //       .select('*')
  //       .eq('storeId', storeId)
  //       .eq('isActive', true);

  //     if (error) throw new BadRequestException(error.message);

  //     // Filter valid discounts
  //     const validDiscounts = (discounts || []).filter((d) => {
  //       return new Date(d.startDate) <= now && new Date(d.endDate) >= now;
  //     });

  //     // 2. Apply discount logic to each product & its variants
  //     return products.map((product) => {
  //       // Find applicable discount for the product
  //       const productDiscount = validDiscounts.find(
  //         (d) => d.type === 'product' && d.productId === product.id,
  //       );
  //       const categoryDiscount = validDiscounts.find(
  //         (d) => d.type === 'category' && d.categoryId === product.categoryId,
  //       );
  //       const storeDiscount = validDiscounts.find((d) => d.type === 'store');

  //       // Pick discount priority: product > category > store
  //       let applicableDiscount =
  //         productDiscount || categoryDiscount || storeDiscount || null;

  //       // Process each variant
  //       const productVariants = (product.productVariants || []).map(
  //         (variant) => {
  //           let finalPrice = variant.price;
  //           let discountApplied = 0;

  //           if (applicableDiscount) {
  //             if (applicableDiscount.discountType === 'percentage') {
  //               discountApplied =
  //                 (variant.price * applicableDiscount.value) / 100;
  //             } else if (applicableDiscount.discountType === 'fixed') {
  //               discountApplied = applicableDiscount.value;
  //             }

  //             // Min order check
  //             if (
  //               applicableDiscount.minOrderAmount &&
  //               variant.price < applicableDiscount.minOrderAmount
  //             ) {
  //               discountApplied = 0; // ignore discount
  //             }

  //             finalPrice = Math.max(0, variant.price - discountApplied);
  //           }

  //           return {
  //             ...variant,
  //             originalPrice: variant.price,
  //             finalPrice,
  //             discountApplied,
  //             hasDiscount: discountApplied > 0,
  //             discount:
  //               discountApplied > 0
  //                 ? {
  //                     id: applicableDiscount.id,
  //                     name: applicableDiscount.name,
  //                     type: applicableDiscount.type,
  //                     discountType: applicableDiscount.discountType,
  //                     value: applicableDiscount.value,
  //                   }
  //                 : null,
  //           };
  //         },
  //       );

  //       return {
  //         ...product,
  //         productVariants, // variants now contain discount info
  //       };
  //     });
  //   } catch (error) {
  //     this.errorHandler(error, 'Failed to apply discounts');
  //   }
  // }

  async applyDiscounts(
    storeId: string,
    products: any[],
  ): Promise<any[] | undefined> {
    try {
      const now = new Date();

      return await this.dataSource.transaction(async (manager) => {
        // 1. Fetch all active discounts for the store
        const discounts = await manager.find(Discount, {
          where: { store: { id: storeId }, is_active: true },
          relations: ['store', 'product', 'category'],
        });

        // 2. Filter valid discounts by date range
        const validDiscounts = (discounts || []).filter(
          (d: Discount) => d.start_date <= now && d.end_date >= now,
        );

        // 3. Apply discounts to each product & its variants
        return products.map((product) => {
          // Find applicable discount for product
          const productDiscount = validDiscounts.find(
            (d) => d.type === 'product' && d.product?.id === product.id,
          );
          const categoryDiscount = validDiscounts.find(
            (d) =>
              d.type === 'category' && d.category?.id === product.categoryId,
          );
          const storeDiscount = validDiscounts.find((d) => d.type === 'store');

          // Priority: product > category > store
          let applicableDiscount =
            productDiscount || categoryDiscount || storeDiscount || null;

          // Process each variant
          const productVariants = (product.productVariants || []).map(
            (variant) => {
              let finalPrice = variant.price;
              let discountApplied = 0;

              if (applicableDiscount) {
                if (applicableDiscount.discount_type === 'percentage') {
                  discountApplied =
                    (variant.price * applicableDiscount.value) / 100;
                } else if (applicableDiscount.discount_type === 'fixed') {
                  discountApplied = applicableDiscount.value;
                }

                // Check min order condition
                if (
                  applicableDiscount.min_order_amount &&
                  variant.price < applicableDiscount.min_order_amount
                ) {
                  discountApplied = 0;
                }

                finalPrice = Math.max(0, variant.price - discountApplied);
              }

              return {
                ...variant,
                originalPrice: variant.price,
                finalPrice,
                discountApplied,
                hasDiscount: discountApplied > 0,
                discount:
                  discountApplied > 0
                    ? {
                        id: applicableDiscount?.id,
                        name: applicableDiscount?.name,
                        type: applicableDiscount?.type,
                        discountType: applicableDiscount?.discount_type,
                        value: applicableDiscount?.value,
                      }
                    : null,
              };
            },
          );

          return {
            ...product,
            productVariants,
          };
        });
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'applyDiscounts');
    }
  }
}
