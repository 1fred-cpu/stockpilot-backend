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
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto, Variant } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Filter } from 'types/filter';
import { Multer } from 'multer';

@Controller('stores/:storeId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Create a new product */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'variantImages', maxCount: 20 },
    ]),
  )
  async createProduct(
    @Param('storeId') storeId: string,
    @Body(new ValidationPipe({ transform: true }))
    createProductDto: CreateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Multer.File[];
      variantImages?: Multer.File[];
    },
  ) {
    try {
      // ✅ Parse JSON fields (tags, attributes, variants[])
      const parsedTags =
        typeof createProductDto.tags === 'string'
          ? JSON.parse(createProductDto.tags)
          : createProductDto.tags;

      const parsedAttributes =
        typeof createProductDto.attributes === 'string'
          ? JSON.parse(createProductDto.attributes)
          : createProductDto.attributes;

      const parsedVariants =
        typeof createProductDto.variants === 'string'
          ? JSON.parse(createProductDto.variants)
          : createProductDto.variants;

      // ✅ Attach images to variants by index
      const variantsWithImages = parsedVariants.map((variant, index) => ({
        ...variant,
        imageFile: files.variantImages?.[index] ?? null,
      }));

      // ✅ Final product payload
      const productPayload = {
        ...createProductDto,
        storeId,
        tags: parsedTags,
        attributes: parsedAttributes,
        variants: variantsWithImages,
        thumbnail: files.thumbnail?.[0] ?? null,
      };

      // ✅ Call service
      return this.productsService.createProduct(productPayload);
    } catch (error) {
      throw new Error('Invalid JSON in product payload');
    }
  }

  /** Add a new variant to an existing product */
  @Post(':productId/variants')
  @UseInterceptors(FileInterceptor('variantImage'))
  async addProductVariant(
    @Param('productId') productId: string,
    @Body(ValidationPipe) variant: Variant,
    @UploadedFile() file: Multer.File,
  ) {
    return this.productsService.addProductVariant(productId, variant, file);
  }

  /** Get products for a store */
  @Get()
  async getProducts(
    @Param('storeId') storeId: string,
    @Query('filter') filter: Filter,
    @Query('limit') limit: number = 10,
    @Query('sort') sort: 'asc' | 'desc' = 'asc',
    @Query('category') category?: string,
  ) {
    return this.productsService.getProducts(
      storeId,
      filter,
      Number(limit),
      sort,
      category,
    );
  }

  /** Find a specific product */
  @Get(':productId')
  async findProduct(@Param('productId') productId: string) {
    return this.productsService.findProduct(productId);
  }

  /** Update an existing product */
  @Patch(':productId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'variantImages', maxCount: 20 },
    ]),
  )
  async updateProduct(
    @Param('productId') productId: string,
    @Param('storeId') storeId: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Multer.File[];
      variantImages?: Multer.File[];
    },
  ) {
    try {
      // ✅ Parse JSON fields (tags, attributes, variants[])
      const parsedTags =
        typeof updateProductDto.tags === 'string'
          ? JSON.parse(updateProductDto.tags)
          : updateProductDto.tags;

      const parsedAttributes =
        typeof updateProductDto.attributes === 'string'
          ? JSON.parse(updateProductDto.attributes)
          : updateProductDto.attributes;

      const parsedVariants =
        typeof updateProductDto.variants === 'string'
          ? JSON.parse(updateProductDto.variants)
          : updateProductDto.variants;

      // ✅ Attach images to variants by index
      const variantsWithImages = parsedVariants.map((variant, index) => ({
        ...variant,
        imageFile: files.variantImages?.[index] ?? null,
      }));

      // ✅ Final product payload
      const productPayload = {
        ...updateProductDto,
        storeId,
        tags: parsedTags,
        attributes: parsedAttributes,
        variants: variantsWithImages,
        thumbnail: files.thumbnail?.[0] ?? null,
      };
      return this.productsService.updateProduct(productId, productPayload);
    } catch (error) {
      throw new Error('Invalid JSON in product payload');
    }
  }

  /** Update a specific product variant */
  @Patch(':productId/variants/:variantId')
  async updateProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body(ValidationPipe) updateVariantDto: any,
  ) {
    return this.productsService.updateProductVariant(
      productId,
      variantId,
      updateVariantDto,
    );
  }

  /** Delete a product */
  @Delete(':productId')
  async deleteProduct(@Param('productId') productId: string) {
    return this.productsService.deleteProduct(productId);
  }

  /** Delete a product variant */
  @Delete(':productId/variants/:variantId')
  async deleteProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteProductVariant(productId, variantId);
  }
}
