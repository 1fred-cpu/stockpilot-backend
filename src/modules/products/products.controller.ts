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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, Variant } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Filter } from 'types/filter';

@Controller('stores/:storeId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Method -- Post
  // Access -- Private
  // Function:  A function to create a new product
  // Returns: A created product or throws an error if the product already exists
  // Endpoint: /v1/api/stores/:storeId/products
  @Post()
  async createProduct(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
  ) {
    return this.productsService.createProduct(createProductDto);
  }

  // Method -- Post
  // Access -- Private
  // Function:  A function to add new variant to product
  // Returns: A created variant or throws an error if variant already exists
  // Endpoint: /v1/api/stores/:storeId/products/:productId/variants
  @Post(':productId/variants')
  async addProductVariant(
    @Param('productId') productId: string,
    @Body(ValidationPipe) variant: Variant,
  ) {
    return this.productsService.addProductVariant(productId, variant);
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to get products
  // Returns: products for a store or throws an error if store is not found
  // Endpoint: /v1/api/stores/:storeId/products/
  @Get()
  async getProducts(
    @Param('storeId') storeId: string,
    @Query('filter') filter: Filter,
    @Query('limit') limit: number = 10,
    @Query('sort') sort: 'asc' | 'desc',
    @Query('category') category: string,
  ) {
    return this.productsService.getProducts(
      storeId,
      filter,
      Number(limit),
      sort,
      category,
    );
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to find product
  // Returns: A product or throws an error if product does not exist
  // Endpoint: /v1/api/stores/:storeId/products/:productId/
  @Get(':productId')
  async findProduct(@Param('productId') productId: string) {
    return this.productsService.findProduct(productId);
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to get product variants
  // Returns: A product variants or throws an error if variant already exists
  // Endpoint: /v1/api/stores/:storeId/products/:productId/variants
  @Get(':productId/variants')
  async getProductVariants(@Param('productId') productId: string) {
    return this.productsService.getProductVariants(productId);
  }

  // Method -- Patch
  // Access -- Private
  // Function:  A function to update product
  // Returns: A updated product or throws an error if product not found
  // Endpoint: /v1/api/stores/:storeId/products/:productId
  @Patch(':productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(productId, updateProductDto);
  }

  // Method -- Patch
  // Access -- Private
  // Function:  A function to update product variant
  // Returns: A updated product variant or throws an error if product and product variant does not exists
  // Endpoint: /v1/api/stores/:storeId/products/:productId/variants/:variantId
  @Patch(':productId/variants/:variantId')
  async updateProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() updateVarinatDto: any,
  ) {
    return this.productsService.updateProductVariant(
      productId,
      variantId,
      updateVarinatDto,
    );
  }

  // Method -- Delete
  // Access -- Private
  // Function:  A function to delete product
  // Returns: A deleted product or throws an error if product does not exist
  // Endpoint: /v1/api/stores/:storeId/products/:productId
  @Delete(':productId')
  async deleteProduct(@Param('productId') productId: string) {
    return this.productsService.deleteProduct(productId);
  }

  // Method -- Delete
  // Access -- Private
  // Function:  A function to delete product variant
  // Returns: A deleted variant or throws an error if variant does not exist
  // Endpoint: /v1/api/stores/:storeId/products/:productId/variants/:variantId
  @Delete(':productId/variants/:variantId')
  async deleteProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteProductVariant(productId, variantId);
  }
}
