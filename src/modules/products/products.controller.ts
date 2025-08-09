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

@Controller('stores/:storeId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
  ) {
    return this.productsService.createProduct(createProductDto);
  }

  @Post(':productId/variants')
  async addProductVariant(
    @Param('productId') productId: string,
    @Body(ValidationPipe) variant: Variant,
  ) {
    return this.productsService.addProductVariant(productId, variant);
  }

  @Get()
  async getProducts(
    @Param('storeId') storeId: string,
    @Query('filter') filter: 'bestseller' | 'trending' | 'featured' | 'new',
    @Query('limit') limit: number = 10,
    @Query('sort') sort: 'asc' | 'desc',
  ) {
    return this.productsService.getProducts(
      storeId,
      filter,
      Number(limit),
      sort,
    );
  }
  @Get(':productId')
  async findProduct(@Param('productId') productId: string) {
    return this.productsService.findProduct(productId);
  }

  @Patch(':productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(productId, updateProductDto);
  }

  @Delete(':productId')
  async deleteProduct(@Param('productId') productId: string) {
    return this.productsService.deleteProduct(productId);
  }

  @Delete(':productId/variants/:variantId')
  async deleteProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteProductVariant(productId, variantId);
  }
}
