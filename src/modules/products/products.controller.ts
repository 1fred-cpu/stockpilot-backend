import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, Variant } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
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

  @Get(':id')
  async findProduct(@Param('id') id: string) {
    return this.productsService.findProduct(id);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, updateProductDto);
  }

  @Delete(':productId/variants/:variantId')
  async deleteProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteProductVariant(productId, variantId);
  }
}
