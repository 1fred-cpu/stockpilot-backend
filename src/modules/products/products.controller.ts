import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ValidationPipe,
    Query
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto, Variant } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Filter } from "types/filter";

@Controller("stores/:storeId/products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    /** Create a new product */
    @Post()
    async createProduct(
        @Param("storeId") storeId: string,
        @Body(ValidationPipe) createProductDto: CreateProductDto
    ) {
        return this.productsService.createProduct({
            ...createProductDto,
            storeId
        });
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
    @Get(":productId")
    async findProduct(@Param("productId") productId: string) {
        return this.productsService.findProduct(productId);
    }

    /** Get all variants for a product */
    @Get(":productId/variants")
    async getProductVariants(
        @Param("storeId") storeId: string,
        @Param("productId") productId: string
    ) {
        return this.productsService.getProductVariants(storeId, productId);
    }

    /** Update an existing product */
    @Patch(":productId")
    async updateProduct(
        @Param("productId") productId: string,
        @Body(ValidationPipe) updateProductDto: UpdateProductDto
    ) {
        return this.productsService.updateProduct(productId, updateProductDto);
    }

    /** Update a specific product variant */
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
    @Delete(":productId")
    async deleteProduct(@Param("productId") productId: string) {
        return this.productsService.deleteProduct(productId);
    }

    /** Delete a product variant */
    @Delete(":productId/variants/:variantId")
    async deleteProductVariant(
        @Param("productId") productId: string,
        @Param("variantId") variantId: string
    ) {
        return this.productsService.deleteProductVariant(productId, variantId);
    }
}
