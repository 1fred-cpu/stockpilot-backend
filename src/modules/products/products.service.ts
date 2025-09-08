import {
    Injectable,
    Inject,
    BadRequestException,
    NotFoundException,
    ConflictException
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { SupabaseClient } from "@supabase/supabase-js";
import { generateSlug } from "src/utils/slug-generator";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { Product } from "src/entities/product.entity";
import { VariantsService } from "./variants.service";
import { getPathFromUrl } from "src/utils/get-path";
import { FileUploadService } from "src/utils/upload-file";
import { Multer } from "multer";
import { DiscountsService } from "../discounts/discounts.service";

@Injectable()
export class ProductsService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
        private readonly errorHandler: HandleErrorService,
        private readonly variantService: VariantsService,
        private readonly fileService: FileUploadService,
        private readonly discountsService: DiscountsService
    ) {}

    /**
     *
     * @param businessId
     * @param dto
     * @returns a product object
     */
    private async createProduct(
        businessId: string,
        dto: CreateProductDto
    ): Promise<Product | undefined> {
        try {
            // Upload thumbnail file and get url

            const path = `variants/${businessId}/${Date.now()}_${
                dto.thumbnail.originalname
            }`;
            const thumbnailUrl = await this.fileService.uploadFile(
                dto.thumbnail,
                path,
                "products"
            );
            const categoryId = await this.handleCategory(dto);

            const id = uuidv4();
            const payload = {
                id,
                business_id: businessId,
                name: dto.name,
                description: dto.description ?? null,
                category: dto.category ?? null,
                brand: dto.brand ?? null,
                thumbnail: thumbnailUrl,
                categoryId,
                tags: dto.tags ?? [],
                slug: generateSlug(dto.name),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from("products")
                .insert([payload]);
            if (error) throw new BadRequestException(error.message);

            return payload;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "createProduct");
        }
    }

    /**
     *
     * @param name
     * @param businessId
     * @returns a boolean value
     */
    private async doProductExists(
        name: string,
        businessId: string
    ): Promise<boolean | undefined> {
        try {
            const { data: existingProduct, error: existsError } =
                await this.supabase
                    .from("products")
                    .select("id")
                    .match({
                        business_id: businessId,
                        name
                    })
                    .maybeSingle();

            if (existsError) {
                throw new BadRequestException(existsError.message);
            }

            if (existingProduct) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.errorHandler.handleServiceError(error, "doProductExists");
        }
    }

    /**
     *
     * @param businessId
     * @returns
     */
    async findAllProductsByBusiness(businessId: string) {
        try {
            const { data, error } = await this.supabase
                .from("products")
                .select(
                    `
        *,
        product_variants (
          id,
          name,
          sku,
          price,
          image_url,
          store_id,
          store_inventory(*),
          store_inventory_batches(*)
        )
        `
                )
                .eq("business_id", businessId);

            if (error) throw new BadRequestException(error.message);
            if (!data || data.length === 0) return [];

            const products = data.map(p => ({
                id: p.id,
                business_id: p.business_id,
                name: p.name,
                description: p.description,
                category: p.category,
                brand: p.brand,
                track_batches: p.track_batches,
                tags: p.tags,
                thumbnail_url: p.thumbnail_url,
                created_at: p.created_at,
                updated_at: p.updated_at,
                product_variants: p.product_variants || []
            }));

            return products;
        } catch (err) {
            this.errorHandler.handleServiceError(err, "findAllByBusiness");
        }
    }
    /**
     *
     * @param productId
     * @returns
     */
    async findProduct(productId: string, storeId: string) {
        try {
            const { data, error } = await this.supabase
                .from("products")
                .select(
                    `
        *,
        product_variants (
          id,
          name,
          sku,
          price,
          image_url,
          store_id,
          store_inventory(*),
          store_inventory_batches(*)
        )
        `
                )
                .eq("id", productId)
                .eq("product_variants.store_id", storeId) // filter variants for the given store
                .maybeSingle();

            if (error) throw new BadRequestException(error.message);
            if (!data) throw new NotFoundException("Product not found");

            const product = {
                id: data.id,
                business_id: data.business_id,
                name: data.name,
                description: data.description,
                category: data.category,
                brand: data.brand,
                track_batches: data.track_batches,
                tags: data.tags,
                thumbnail_url: data.thumbnail_url,
                created_at: data.created_at,
                updated_at: data.updated_at,
                product_variants: data.product_variants || []
            };

            return this.discountsService.applyDiscounts(storeId, [product])[0];
        } catch (err) {
            this.errorHandler.handleServiceError(err, "findOne");
        }
    }

    /**
     *
     * @param storeId
     * @returns
     */
    async findAllProductsByStore(storeId: string) {
        try {
            const { data, error } = await this.supabase
                .from("products")
                .select(
                    `
        *,
        product_variants (
          id,
          name,
          sku,
          price,
          image_url,
          store_id,
          store_inventory(*),
          store_inventory_batches(*)
        )
        `
                )
                .eq("product_variants.store_id", storeId);

            if (error) throw new BadRequestException(error.message);

            // Restructure into { product: { ... , product_variants: [...] } }
            const products = (data || []).map(p => ({
                id: p.id,
                business_id: p.business_id,
                name: p.name,
                description: p.description,
                category: p.category,
                brand: p.brand,
                track_batches: p.track_batches,
                tags: p.tags,
                thumbnail_url: p.thumbnail_url,
                created_at: p.created_at,
                updated_at: p.updated_at,
                product_variants: p.product_variants || []
            }));

            return this.discountsService.applyDiscounts(storeId, products);
        } catch (err) {
            this.errorHandler.handleServiceError(err, "findAllByStore");
        }
    }
    /**
     *
     * @param businessId
     * @param dto
     * @returns
     */
    async createProductWithVariants(businessId: string, dto: CreateProductDto) {
        try {
            // Check if product already exists
            if (await this.doProductExists(dto.name, businessId)) {
                throw new ConflictException(
                    "Product with this name already exists"
                );
            }
            // 1. Create product
            const product = await this.createProduct(businessId, dto);

            const createdVariants: any[] = [];

            // 2. Handle variants
            for (const variant of dto.variants) {
                // 2a. insert variant
                const newVariant = await this.variantService.createVariant(
                    businessId,
                    dto.store_id,
                    product?.id as string,
                    variant,
                    variant.image_file
                );

                // 2b. Create inventory row
                await this.supabase.from("store_inventory").insert({
                    store_id: dto.store_id,
                    business_id: businessId,
                    variant_id: newVariant?.id,
                    quantity: variant.quantity,
                    low_stock_threshold: variant.low_stock_threshold
                });

                if (dto.track_batches) {
                    // 2d. Create batch row
                    await this.supabase.from("store_inventory_batches").insert({
                        store_id: dto.store_id,
                        business_id: businessId,
                        variant_id: newVariant?.id,
                        batch_number: `BATCH-${Date.now()}`,
                        quantity: variant.quantity,
                        received_at: new Date(),
                        expiry_date: variant.expiry_date ?? null
                    });
                }

                createdVariants.push(newVariant);
            }

            return {
                product,
                variants: createdVariants,
                message: "Product and variants created successfully"
            };
        } catch (error) {
            this.errorHandler.handleServiceError(
                error,
                "createProductWithVariants"
            );
        }
    }

    /**
     * Main method: update product and variants
     */
    async updateProductWithVariants(
        productId: string,
        updateDto: UpdateProductDto,
        storeId: string
    ) {
        try {
            // Step 1: Update product
            await this.updateProduct(productId, updateDto);

            // Step 2: Process variants (update, add, or remove)
            for (const variant of updateDto.variants) {
                if (variant.id) {
                    await this.updateVariantAndInventory(
                        variant,
                        storeId,
                        updateDto.business_id as string
                    );
                } else {
                    await this.createVariantAndInventory(
                        productId,
                        variant,
                        storeId,
                        updateDto.business_id as string
                    );
                }
            }

            // Step 3: Handle removed variants
            if (updateDto.removedVariantIds?.length > 0) {
                await this.removeVariants(updateDto.removedVariantIds, storeId);
            }

            return { message: "Product and variants updated successfully" };
        } catch (err) {
            this.errorHandler.handleServiceError(
                err,
                "updateProductWithVariants"
            );
        }
    }

    /**
     * Update product details
     */
    private async updateProduct(productId: string, dto: UpdateProductDto) {
        // find category
        const categoryId = await this.handleCategory(dto);

        // update thumbnail
        if (dto.thumbnail) {
            dto.thumbnail = await this.handleThumbnail(dto, dto.thumbnail);
        }

        const { error } = await this.supabase
            .from("products")
            .update({
                name: dto.name,
                description: dto.description,
                tags: dto.tags,
                slug: generateSlug(dto.name),
                category: dto.category,
                thumbnail: dto.thumbnail,
                categoryId,
                brand: dto.brand
            })
            .eq("id", productId);

        if (error) throw new BadRequestException(error.message);
    }

    private async handleCategory(dto: UpdateProductDto): Promise<string> {
        const { data, error } = await this.supabase
            .from("categories")
            .select("id")
            .eq("name", dto.category)
            .maybeSingle();

        if (error)
            throw new BadRequestException(
                "Supabase error fetching category: " + error.message
            );
        if (data) return data.id;

        // Create new category
        const { data: newCategory, error: insertError } = await this.supabase
            .from("categories")
            .insert([{ name: dto.category, store_id: dto.store_id }])
            .select();

        if (insertError)
            throw new BadRequestException(
                "Supabase error creating category: " + insertError.message
            );

        return newCategory[0].id;
    }

    private async handleThumbnail(
        dto: any,
        newThumbnail: Multer.File
    ): Promise<string> {
        if (dto.thumbnail) {
            const prevPath = getPathFromUrl(dto.thumbnail);
            await this.fileService.deleteFile(prevPath, "products");
        }

        const path = `variants/${dto.business_id}/${Date.now()}_${
            newThumbnail.originalname
        }`;
        return await this.fileService.uploadFile(
            newThumbnail,
            path,
            "products"
        );
    }

    /**
     * Update an existing variant + inventory
     */
    private async updateVariantAndInventory(
        variant: any,
        storeId: string,
        businessId: string
    ) {
        // Check wants to change variant image
        if (variant.image_file) {
            // Delete previous image from storage
            const previousPath = getPathFromUrl(variant.image_url);
            await this.fileService.deleteFile(previousPath, "products");

            // Create new Image in storage
            const newPath = `variants/${businessId}/${Date.now()}_${
                variant.sku
            }${variant.image_file.originalname}`;
            const imageUrl = await this.fileService.uploadFile(
                variant.image_file,
                newPath,
                "products"
            );
            variant.image_url = imageUrl;
        }
        const { error: variantError } = await this.supabase
            .from("product_variants")
            .update({
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                image_url: variant.image_url,
                attributes: variant.attributes ?? {}
            })
            .eq("id", variant.id);

        if (variantError) throw new BadRequestException(variantError.message);

        const { error: inventoryError } = await this.supabase
            .from("store_inventory")
            .update({
                low_stock_threshold: variant.inventory.low_stock_threshold,
                reserved: variant.inventory.reserved
            })
            .eq("variant_id", variant.id)
            .eq("store_id", storeId);

        if (inventoryError)
            throw new BadRequestException(inventoryError.message);
    }

    /**
     * Create a new variant + inventory
     */
    private async createVariantAndInventory(
        productId: string,
        variant: any,
        storeId: string,
        businessId: string
    ) {
        // Create new Image in storage
        const path = `variants/${businessId}/${Date.now()}_${variant.sku}${
            variant.image_file.originalname
        }`;
        const imageUrl = await this.fileService.uploadFile(
            variant.image_file,
            path,
            "products"
        );
        variant.image_url = imageUrl;

        const { data: newVariant, error: variantError } = await this.supabase
            .from("product_variants")
            .insert({
                product_id: productId,
                store_id: storeId,
                business_id: businessId,
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                image_url: variant.image_url,
                attributes: variant.attributes ?? []
            })
            .select("id")
            .maybeSingle();

        if (variantError) throw new BadRequestException(variantError.message);

        const { error: inventoryError } = await this.supabase
            .from("store_inventory")
            .insert({
                store_id: storeId,
                variant_id: newVariant?.id,
                quantity: variant.inventory.quantity || 0,
                low_stock_threshold: variant.inventory.low_stock_threshold,
                reserved: variant.inventory.reserved
            });

        if (inventoryError)
            throw new BadRequestException(inventoryError.message);
    }

    /**
     * Remove variants (and inventory) by IDs
     */
    private async removeVariants(variantIds: string[], storeId: string) {
        // First delete inventory records
        const { error: inventoryError } = await this.supabase
            .from("store_inventory")
            .delete()
            .in("variant_id", variantIds)
            .eq("store_id", storeId);

        if (inventoryError)
            throw new BadRequestException(inventoryError.message);

        // Then delete variants
        const { data: variants, error: variantError } = await this.supabase
            .from("product_variants")
            .delete()
            .in("id", variantIds)
            .select();

        if (variantError) throw new BadRequestException(variantError.message);

        // Loop through each variant and delete image from storage
        for (const variant of variants) {
            const path = getPathFromUrl(variant.image_url);
            await this.fileService.deleteFile(path, "products");
        }
    }
}
