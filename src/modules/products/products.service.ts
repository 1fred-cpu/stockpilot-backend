import {
    Injectable,
    Inject,
    ConflictException,
    InternalServerErrorException,
    BadRequestException,
    Logger,
    NotFoundException
} from "@nestjs/common";
import { CreateProductDto, Variant } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { isValidUUID } from "../../../utils/id-validator";
import { generateSlug } from "utils/slug-generator";
import { Filter } from "types/filter";
import { Multer } from "multer";
import { FileUploadService } from "../../../utils/upload-file";
import { DiscountsService } from "../discounts/discounts.service";

@Injectable()
export class ProductsService {
    private logger = new Logger(ProductsService.name);

    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any,
        private readonly fileUploadService: FileUploadService,
        private readonly discountsService: DiscountsService
    ) {}

    /** Helper: Validate UUID */
    private validateUUID(id: string, fieldName: string) {
        if (!isValidUUID(id)) {
            throw new BadRequestException(`Invalid ${fieldName} provided`);
        }
    }

    /** Helper: Fetch product by ID */
    private async getProductById(productId: string) {
        const { data: product, error } = await this.supabase
            .from("products")
            .select("*, stores(storeName)")
            .eq("id", productId)
            .maybeSingle();

        if (error) {
            throw new BadRequestException(
                `Error retrieving product: ${error.message}`
            );
        }
        if (!product) {
            throw new NotFoundException("Product does not exist");
        }
        return product;
    }

    /** Create product with variants + inventory */
    async createProduct(createProductDto: any) {
        console.log("pass");
        try {
            const {
                storeId,
                name,
                brand,
                category,
                description,
                tags,
                attributes,
                variants,
                thumbnail,
                storeName
            } = createProductDto;

            this.validateUUID(storeId, "store ID");

            // Generate slug for product
            const slug = generateSlug(name);
            // Check duplicate product name in store
            const { data: existingProduct, error: existsError } =
                await this.supabase
                    .from("products")
                    .select("id")
                    .match({ slug, storeId })
                    .maybeSingle();

            if (existsError) {
                throw new BadRequestException(
                    `Error checking product: ${existsError.message}`
                );
            }
            if (existingProduct) {
                throw new ConflictException("Product already exists");
            }

            // Upload thumbnail file and get url

            const path = `stores/${storeName}/${new Date().getTime()}_${
                thumbnail.originalname
            }`;
            const bucket = "products";
            const thumbnailUrl = await this.fileUploadService.uploadFile(
                thumbnail,
                path,
                bucket
            );

            if (!thumbnailUrl) {
                throw new BadRequestException("Thumbnail file is required");
            }

            // Create product
            const newProductData = {
                name,
                brand,
                category,
                description,
                storeId,
                thumbnail: thumbnailUrl,
                tags: tags || [],
                attributes: attributes || {},
                slug
            };

            const { data: productData, error: productError } =
                await this.supabase
                    .from("products")
                    .insert([newProductData])
                    .select();

            if (productError) {
                throw new BadRequestException(
                    `Error creating product: ${productError.message}`
                );
            }

            const product = productData[0];

            // Create variants
            const variantsToInsert = variants.map(async variant => {
                // Define a path to upload file
                const path = `stores/${storeName}/${new Date().getTime()}_${
                    variant.imageFile.originalname
                }`;
                // Bucket name to store files
                const bucket = "products";
                // Upload file and return url
                const imageUrl = await this.fileUploadService.uploadFile(
                    variant.imageFile,
                    path,
                    bucket
                );
                // Throw an error if image url is empty
                if (!imageUrl) {
                    throw new BadRequestException(
                        "Variant image file required"
                    );
                }

                return {
                    productId: product.id,
                    sku: variant.sku,
                    color: variant.color,
                    size: variant.size,
                    price: variant.price,
                    weight: variant.weight,
                    imageUrl,
                    dimensions: variant.dimensions
                };
            });

            const { data: variantsData, error: variantsError } =
                await this.supabase
                    .from("variants")
                    .insert(await Promise.all(variantsToInsert))
                    .select();

            if (variantsError) {
                throw new BadRequestException(
                    `Error creating variants: ${variantsError.message}`
                );
            }

            // Create inventory
            const inventoryToInsert = variantsData.map((variant, index) => ({
                productId: product.id,
                storeId,
                variantId: variant.id,
                stock: variants[index].stock,
                reserved: variants[index].reserved,
                totalStock: variants[index].stock,
                lowStockThreshold: variants[index].lowStockThreshold
            }));

            const { data: inventoryData, error: inventoryError } =
                await this.supabase
                    .from("inventories")
                    .insert(inventoryToInsert)
                    .select();

            if (inventoryError) {
                throw new BadRequestException(
                    `Error creating inventory: ${inventoryError.message}`
                );
            }

            return {
                product,
                variants: variantsData,
                inventories: inventoryData
            };
        } catch (error) {
            this.logger.error("Error creating product:", error);
            if (
                error instanceof ConflictException ||
                error instanceof BadRequestException
            )
                throw error;
            throw new InternalServerErrorException(
                "Unexpected error creating product"
            );
        }
    }

    /** Find product and variants */
    async findProduct(productId: string) {
        try {
            this.validateUUID(productId, "product ID");
            const product = await this.getProductById(productId);

            const { data: variants, error: variantsError } = await this.supabase
                .from("variants")
                .select("*, inventories(stock,lowStockThreshold)")
                .eq("productId", productId);

            if (variantsError) {
                throw new BadRequestException(
                    `Error retrieving product variants: ${variantsError.message}`
                );
            }
            if (!variants.length) {
                throw new NotFoundException(
                    "No variants found for this product"
                );
            }
            const productWithVariants = { ...product, variants };

            const appliedDiscountProductWithVariants =
                (await this.discountsService.applyDiscounts(product.storeId, [
                    productWithVariants
                ])) || [];

            return { product: appliedDiscountProductWithVariants[0] };
        } catch (error) {
            if (
                error instanceof ConflictException ||
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            this.logger.error("Error retrieving product: ", error.message);
            throw new InternalServerErrorException(
                "Unexpected error retrieving product"
            );
        }
    }

    /** Get products with optional filter/category */
    async getProducts(
        storeId: string,
        filter?: Filter,
        limit = 100,
        sort: "asc" | "desc" = "desc",
        category?: string
    ) {
        try {
            this.validateUUID(storeId, "store ID");

            let query = this.supabase
                .from("products")
                .select("*")
                .eq("storeId", storeId);

            // Apply filter
            if (filter) {
                switch (filter) {
                    case "bestseller":
                        query = query.eq("isBestseller", true);
                        break;
                    case "featured":
                        query = query.eq("isFeatured", true);
                        break;
                    case "new":
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        query = query.gte(
                            "createdAt",
                            thirtyDaysAgo.toISOString()
                        );
                        break;
                    case "trending":
                        query = query.eq("isTrending", true);
                        break;
                    default:
                        throw new BadRequestException("Invalid filter type");
                }
            }

            if (!filter && category) {
                query = query.eq("category", category);
            }

            // Sort + limit
            query = query
                .order("createdAt", { ascending: sort === "asc" })
                .limit(limit);

            const { data: products, error: fetchError } = await query;
            if (fetchError) {
                throw new BadRequestException(
                    `Error fetching products: ${fetchError.message}`
                );
            }
            if (!products?.length) {
                throw new NotFoundException("No products found");
            }

            // Attach variants
            for (const product of products) {
                const { data: variants, error: variantsError } =
                    await this.supabase
                        .from("variants")
                        .select("*, inventories(stock, lowStockThreshold)")
                        .eq("productId", product.id);

                if (variantsError) {
                    throw new BadRequestException(
                        `Error fetching variants: ${variantsError.message}`
                    );
                }
                product.variants = variants || [];
            }

            const appliedDiscountsProducts =
                await this.discountsService.applyDiscounts(storeId, products);

            return { products: appliedDiscountsProducts };
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            )
                throw error;
            this.logger.error("Error retrieving products: ", error.message);
            throw new InternalServerErrorException(
                "Unexpected error retrieving products"
            );
        }
    }

    /** Update product */
    async updateProduct(productId: string, updateProductDto: UpdateProductDto) {
        try {
            this.validateUUID(productId, "product ID");
            const product = await this.getProductById(productId);

            const updatedSlug = updateProductDto.name
                ? generateSlug(updateProductDto.name)
                : product.slug;

            const { data: updatedProduct, error: updateError } =
                await this.supabase
                    .from("products")
                    .update({
                        ...updateProductDto,
                        slug: updatedSlug,
                        updatedAt: new Date()
                    })
                    .eq("id", productId)
                    .select();

            if (updateError) {
                throw new BadRequestException(
                    `Error updating product: ${updateError.message}`
                );
            }

            return updatedProduct[0];
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            this.logger.error("Error updating product: ", error.message);
            throw new InternalServerErrorException(
                "Unexpected error updating product"
            );
        }
    }

    /** Delete product */
    async deleteProduct(productId: string) {
        try {
            this.validateUUID(productId, "product ID");

            const { data: deletedProduct, error: deleteError } =
                await this.supabase
                    .from("products")
                    .delete()
                    .eq("id", productId)
                    .select();

            if (deleteError) {
                throw new BadRequestException(
                    `Error deleting product: ${deleteError.message}`
                );
            }
            if (!deletedProduct) {
                throw new NotFoundException("Product does not exist");
            }

            return { message: "Product deleted successfully" };
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            this.logger.error("Error deleting product: ", error.message);
            throw new InternalServerErrorException(
                "Unexpected error deleting product"
            );
        }
    }

    /** Update product variant */
    async updateProductVariant(
        productId: string,
        variantId: string,
        updateVariantDto: any
    ) {
        try {
            this.validateUUID(productId, "product ID");
            this.validateUUID(variantId, "variant ID");

            await this.getProductById(productId);

            const { data: updatedVariant, error: updateError } =
                await this.supabase
                    .from("variants")
                    .update({ ...updateVariantDto, updatedAt: new Date() })
                    .match({ productId, id: variantId })
                    .select();

            if (updateError) {
                throw new BadRequestException(
                    `Error updating product variant: ${updateError.message}`
                );
            }
            if (!updatedVariant.length) {
                throw new NotFoundException("Product variant does not exist");
            }

            return updatedVariant[0];
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            this.logger.error(
                "Error updating product variant: ",
                error.message
            );
            throw new InternalServerErrorException(
                "Unexpected error updating product variant"
            );
        }
    }

    /** Delete product variant */
    async deleteProductVariant(productId: string, variantId: string) {
        try {
            this.validateUUID(productId, "product ID");
            this.validateUUID(variantId, "variant ID");

            await this.getProductById(productId);

            const { data: deletedVariant, error: deleteError } =
                await this.supabase
                    .from("variants")
                    .delete()
                    .match({ productId, id: variantId })
                    .select();

            if (deleteError) {
                throw new BadRequestException(
                    `Error deleting product variant: ${deleteError.message}`
                );
            }
            if (!deletedVariant.length) {
                throw new NotFoundException("Product variant does not exist");
            }

            return deletedVariant[0];
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            this.logger.error(
                "Error deleting product variant: ",
                error.message
            );
            throw new InternalServerErrorException(
                "Unexpected error deleting product variant"
            );
        }
    }

    /** Add product variant */
    async addProductVariant(
        productId: string,
        variant: Variant,
        file: Multer.File
    ) {
        try {
            this.validateUUID(productId, "product ID");
            const product = await this.getProductById(productId);

            // Check SKU uniqueness
            const { data: existingVariant, error: fetchError } =
                await this.supabase
                    .from("variants")
                    .select("*")
                    .match({ sku: variant.sku })
                    .maybeSingle();

            if (fetchError) {
                throw new BadRequestException(
                    `Error checking product variant: ${fetchError.message}`
                );
            }
            if (existingVariant) {
                throw new ConflictException("Product variant already exists");
            }

            // Define a path to upload file
            const path = `stores/${
                product.stores.storeName
            }/${new Date().getTime()}_${file.originalname}`;

            // Bucket name to store files
            const bucket = "products";
            // Upload file and return url
            const imageUrl = await this.fileUploadService.uploadFile(
                file,
                path,
                bucket
            );
            // Throw an error if image url is empty
            if (!imageUrl) {
                throw new BadRequestException("Variant image file required");
            }

            // Create variant
            const newVariantData = {
                productId,
                sku: variant.sku,
                color: variant.color,
                size: variant.size,
                price: variant.price,
                weight: variant.weight,
                imageUrl,
                dimensions: variant.dimensions
            };

            const { data: createdVariant, error: createError } =
                await this.supabase
                    .from("variants")
                    .insert([newVariantData])
                    .select();

            if (createError) {
                throw new BadRequestException(
                    `Error creating product variant: ${createError.message}`
                );
            }

            // Create inventory
            const { data: variantInventory, error: inventoryError } =
                await this.supabase
                    .from("inventories")
                    .insert([
                        {
                            productId,
                            variantId: createdVariant[0].id,
                            stock: variant.stock,
                            reserved: variant.reserved ?? 0,
                            lowStockThreshold: variant.lowStockThreshold
                        }
                    ])
                    .select();

            if (inventoryError) {
                throw new BadRequestException(
                    `Error creating inventory: ${inventoryError.message}`
                );
            }

            return {
                variant: createdVariant[0],
                inventory: variantInventory[0]
            };
        } catch (error) {
            if (
                error instanceof ConflictException ||
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            this.logger.error("Error adding product variant: ", error.message);
            throw new InternalServerErrorException(
                "Unexpected error adding product variant"
            );
        }
    }
}
