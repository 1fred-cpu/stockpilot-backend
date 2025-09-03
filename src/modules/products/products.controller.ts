import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ValidationPipe,
    Query,
    UploadedFiles,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    HttpCode,
    HttpStatus
} from "@nestjs/common";
import {
    FileFieldsInterceptor,
    FileInterceptor
} from "@nestjs/platform-express";
import { ProductsService } from "./products.service";
import { CreateProductDto, Variant } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Filter } from "types/filter";
import { Multer } from "multer";

@Controller("stores/:storeId/products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    /** Create a new product */
    @HttpCode(HttpStatus.CREATED)
    @Post()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: "thumbnail", maxCount: 1 },
            { name: "variantImages", maxCount: 20 }
        ])
    )
    async createProduct(
        @Param("storeId") storeId: string,
        @Body(new ValidationPipe({ transform: true }))
        createProductDto: CreateProductDto,
        @UploadedFiles()
        files: {
            thumbnail?: Multer.File[];
            variantImages?: Multer.File[];
        }
    ) {
        try {
            // ✅ Parse JSON fields (tags, attributes, variants[])
            const parsedTags =
                typeof createProductDto.tags === "string"
                    ? JSON.parse(createProductDto.tags)
                    : createProductDto.tags;

            const parsedAttributes =
                typeof createProductDto.attributes === "string"
                    ? JSON.parse(createProductDto.attributes)
                    : createProductDto.attributes;

            const parsedVariants =
                typeof createProductDto.variants === "string"
                    ? JSON.parse(createProductDto.variants)
                    : createProductDto.variants;

            // ✅ Attach images to variants by index
            const variantsWithImages = parsedVariants.map((variant, index) => ({
                ...variant,
                imageFile: files.variantImages?.[index] ?? null
            }));

            // ✅ Final product payload
            const productPayload = {
                ...createProductDto,
                storeId,
                tags: parsedTags,
                attributes: parsedAttributes,
                variants: variantsWithImages,
                thumbnail: files.thumbnail?.[0] ?? null
            };

            // ✅ Call service
            return this.productsService.createProduct(productPayload);
        } catch (error) {
            throw new Error("Invalid JSON in product payload");
        }
    }

    /** Add a new variant to an existing product */

    @Post(":productId/variants")
    async addProductVariant(
        @Param("productId") productId: string,
        @Body(ValidationPipe) variant: Variant
    ) {
        return this.productsService.addProductVariant(productId, variant);
    }

    /** Get products for a store */
    @HttpCode(HttpStatus.OK)
    @Get()
    async getProducts(
        @Param("storeId") storeId: string,
        @Query("filter") filter: Filter,
        @Query("limit") limit: number = 10,
        @Query("sort") sort: "asc" | "desc" = "asc",
        @Query("category") category?: string
    ) {
        return this.productsService.getProducts(
            storeId,
            filter,
            Number(limit),
            sort,
            category
        );
    }

    /** Find a specific product */
    @HttpCode(HttpStatus.OK)
    @Get(":productId")
    async findProduct(@Param("productId") productId: string) {
        return this.productsService.findProduct(productId);
    }

    /** Update an existing product */
    @HttpCode(HttpStatus.OK)
    @Patch(":productId")
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: "thumbnail", maxCount: 1 },
            { name: "variantImages", maxCount: 20 }
        ])
    )
    async updateProduct(
        @Param("productId") productId: string,
        @Param("storeId") storeId: string,
        @Body(new ValidationPipe({ transform: true }))
        updateProductDto: UpdateProductDto,
        @UploadedFiles()
        files: {
            thumbnail?: Multer.File[];
            variantImages?: Multer.File[];
        }
    ) {
        try {
            // ✅ Parse JSON fields (tags, attributes, variants, variantsToDelete)

            const thumbnail = files?.thumbnail?.[0] ?? null;
            const parsedTags =
                typeof updateProductDto.tags === "string"
                    ? JSON.parse(updateProductDto.tags)
                    : updateProductDto.tags || [];

            const parsedAttributes =
                typeof updateProductDto.attributes === "string"
                    ? JSON.parse(updateProductDto.attributes)
                    : updateProductDto.attributes;

            const parsedVariants =
                typeof updateProductDto.variants === "string"
                    ? JSON.parse(updateProductDto.variants)
                    : updateProductDto.variants;

            const parsedVariantsToDelete =
                typeof updateProductDto.variantsToDelete === "string"
                    ? JSON.parse(updateProductDto.variantsToDelete)
                    : updateProductDto.variantsToDelete || [];

            // ✅ Attach images to variants by index
            const variantsWithImages =
                parsedVariants?.map(variant => {
                  if(!files.variantImages) return null

                    files?.variantImages.forEach(variantFile => {
                        if (variant.sku === variantFile?.sku) {
                            variant.imageFile = variantFile;
                        }
                    });

                    return variant;
                }) || [];

            // ✅ Final product payload
            const productPayload = {
                ...updateProductDto,
                storeId,
                tags: parsedTags,
                attributes: parsedAttributes,
                variants: variantsWithImages,
                variantsToDelete: parsedVariantsToDelete,
                thumbnail
            };

            return this.productsService.updateProduct(
                productId,
                productPayload
            );
        } catch (error) {
            console.error(error);
            throw new BadRequestException("Invalid JSON in product payload");
        }
    }

    /** Update a specific product variant */
    @HttpCode(HttpStatus.OK)
    @Patch(":productId/variants/:variantId")
    async updateProductVariant(
        @Param("productId") productId: string,
        @Param("variantId") variantId: string,
        @Body(ValidationPipe) updateVariantDto: any
    ) {
        return this.productsService.updateProductVariant(
            productId,
            variantId,
            updateVariantDto
        );
    }

    /** Delete a product */
    @HttpCode(HttpStatus.OK)
    @Delete(":productId")
    async deleteProduct(@Param("productId") productId: string) {
        return this.productsService.deleteProduct(productId);
    }

    /** Delete a product variant */
    @HttpCode(HttpStatus.OK)
    @Delete(":productId/variants/:variantId")
    async deleteProductVariant(
        @Param("productId") productId: string,
        @Param("variantId") variantId: string
    ) {
        return this.productsService.deleteProductVariant(productId, variantId);
    }
}
