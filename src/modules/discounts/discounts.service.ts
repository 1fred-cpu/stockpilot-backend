import {
    Injectable,
    Logger,
    Inject,
    ConflictException,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException
} from "@nestjs/common";
import { CreateDiscountDto } from "./dto/create-discount.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";
import { isValidUUID } from "../../../utils/id-validator";
@Injectable()
export class DiscountsService {
    private logger = new Logger(DiscountsService.name);
    constructor(@Inject("SUPABASE_CLIENT") private readonly supabase: any) {}

    async createDiscount(createDiscountDto: CreateDiscountDto) {
        try {
            // 1. Validate storeId format
            this.UUIDValidationFormat(createDiscountDto.storeId, "storeId");
            // 2. Check if discount exists
            const { data: existsDiscount, error: existsDiscountError } =
                await this.supabase
                    .from("discounts")
                    .select("id")
                    .match({
                        name: createDiscountDto.name,
                        storeId: createDiscountDto.storeId
                    })
                    .maybeSingle();

            if (existsDiscountError) {
                throw new BadRequestException(`Error checking discount existence:
              ${existsDiscountError.message}`);
            }
            if (existsDiscount) {
                throw new ConflictException("Discount already exists");
            }

            // 3. Create new Discount
            const { data: newDiscount, error: newDiscountError } =
                await this.supabase
                    .from("discounts")
                    .upsert(createDiscountDto)
                    .select();

            if (newDiscountError) {
                throw new BadRequestException(`Error creating discount:
              ${newDiscountError.message}`);
            }

            return {
                discount: newDiscount
            };
        } catch (error) {
            this.errorHandler(error, "Failed to create Discount");
        }
    }

    async findAllDiscounts(storeId: string) {
        try {
            // 1. Validate storeId format
            this.UUIDValidationFormat(storeId, "storeId");

            // 2. Get all discounts with storeId
            const { data: discounts, error: discountsError } =
                await this.supabase
                    .from("discounts")
                    .select("*")
                    .eq("storeId", storeId);
            if (discountsError) {
                throw new BadRequestException(`Error fetching all discounts:
              ${discountsError.message}`);
            }

            if (discounts.length === 0) {
                throw new NotFoundException("No discounts data found");
            }
            return discounts;
        } catch (error) {
            this.errorHandler(error, "Failed to fetch all discounts");
        }
    }

    async findDiscount(discountId: string) {
        try {
            // 1. Validate discountId format
            this.UUIDValidationFormat(discountId, "discountId");

            //. Find discount with discountId
            const { data: discount, error: discountError } = await this.supabase
                .from("discounts")
                .select("*")
                .eq("id", discountId)
                .maybeSingle();
            if (discountError) {
                throw new BadRequestException(`Error fetching discount data:
              ${discountError.message}`);
            }

            if (!discount) {
                throw new NotFoundException("No discount data not found");
            }
            return discount;
        } catch (error) {
            this.errorHandler(error, "Failed to fetch discount data ");
        }
    }

    async updateDiscount(
        discountId: string,
        updateDiscountDto: UpdateDiscountDto
    ) {
        try {
            //. 1 Validate discountId format
            this.UUIDValidationFormat(discountId, "discountId");

            // 2. Update discount
            const { data: updatedDiscount, error: updatedDiscountError } =
                await this.supabase
                    .from("discounts")
                    .update({
                        ...updateDiscountDto,
                        updatedAt: new Date().toISOString()
                    })
                    .eq("id", discountId)
                    .select();

            // 3. Throw error when updating fails
            if (updatedDiscountError) {
                throw new BadRequestException(`Error updating discount data:
            ${updatedDiscountError.message}`);
            }
            // 4. Throw error if discount data not found
            if (!updatedDiscount || updatedDiscount.length === 0) {
                throw new NotFoundException("Discount data not found");
            }

            // 5. Return updated discount data
            return updatedDiscount;
        } catch (error) {
            this.errorHandler(error, "Failed to update discount data");
        }
    }

    async deleteDiscount(discountId: string) {
        try {
            //. 1 Validate discountId format
            this.UUIDValidationFormat(discountId, "discountId");

            // 2. Delete discount
            const { data: deletedDiscount, error: deletedDiscountError } =
                await this.supabase
                    .from("discounts")
                    .delete()
                    .eq("id", discountId)
                    .select();

            // 3. Throw error when updating fails
            if (deletedDiscountError) {
                throw new BadRequestException(`Error deleting discount data:
            ${deletedDiscountError.message}`);
            }
            // 4. Throw error if discount data not found
            if (!deletedDiscount || deletedDiscount.length === 0) {
                throw new NotFoundException("Discount data not found");
            }

            // 5. Return deleted discount data
            return deletedDiscount;
        } catch (error) {
            this.errorHandler(error, "Failed to delete discount data");
        }
    }

    errorHandler(error: any, message: string) {
        if (
            error instanceof BadRequestException ||
            ConflictException ||
            NotFoundException
        )
            throw error;

        this.logger.error(`${message}: ${error.message}`);

        throw new InternalServerErrorException(message);
    }

    UUIDValidationFormat(uuid: string, field: string) {
        if (!isValidUUID(uuid)) {
            throw new BadRequestException(`Invalid format of ${field}`);
        }
        return;
    }

    /**
     * Apply discounts to products with variants.
     * @param storeId string
     * @param products Array of products { id, categoryId, variants: [{ id, price }] }
     */
    async applyDiscounts(storeId: string, products: any[]): Promise<any[]> {
        try {
            const now = new Date();

            // 1. Fetch all active discounts for the store
            const { data: discounts, error } = await this.supabase
                .from("discounts")
                .select("*")
                .eq("storeId", storeId)
                .eq("isActive", true);

            if (error) throw new BadRequestException(error.message);

            // Filter valid discounts
            const validDiscounts = (discounts || []).filter(d => {
                return (
                    new Date(d.startDate) <= now && new Date(d.endDate) >= now
                );
            });

            // 2. Apply discount logic to each product & its variants
            return products.map(product => {
                // Find applicable discount for the product
                const productDiscount = validDiscounts.find(
                    d => d.type === "product" && d.productId === product.id
                );
                const categoryDiscount = validDiscounts.find(
                    d =>
                        d.type === "category" &&
                        d.categoryId === product.categoryId
                );
                const storeDiscount = validDiscounts.find(
                    d => d.type === "store"
                );

                // Pick discount priority: product > category > store
                let applicableDiscount =
                    productDiscount ||
                    categoryDiscount ||
                    storeDiscount ||
                    null;

                // Process each variant
                const variants = (product.variants || []).map(variant => {
                    let finalPrice = variant.price;
                    let discountApplied = 0;

                    if (applicableDiscount) {
                        if (applicableDiscount.discountType === "percentage") {
                            discountApplied =
                                (variant.price * applicableDiscount.value) /
                                100;
                        } else if (
                            applicableDiscount.discountType === "fixed"
                        ) {
                            discountApplied = applicableDiscount.value;
                        }

                        // Min order check
                        if (
                            applicableDiscount.minOrderAmount &&
                            variant.price < applicableDiscount.minOrderAmount
                        ) {
                            discountApplied = 0; // ignore discount
                        }

                        finalPrice = Math.max(
                            0,
                            variant.price - discountApplied
                        );
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
                                      id: applicableDiscount.id,
                                      name: applicableDiscount.name,
                                      type: applicableDiscount.type,
                                      discountType:
                                          applicableDiscount.discountType,
                                      value: applicableDiscount.value
                                  }
                                : null
                    };
                });

                return {
                    ...product,
                    variants // variants now contain discount info
                };
            });
        } catch (error) {
            this.errorHandler(error, "Failed to apply discounts");
        }
    }
}
