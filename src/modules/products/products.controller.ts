import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ValidationPipe,
  UploadedFiles,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
@Controller('businesses')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Create a new product */
  @HttpCode(HttpStatus.CREATED)
  @Post(':businessId/products')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail_file', maxCount: 1 },
      { name: 'variantImages', maxCount: 20 },
    ]),
  )
  async createProductWithVariants(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body(new ValidationPipe({ transform: true }))
    createProductDto: CreateProductDto,
    @UploadedFiles()
    files: {
      thumbnailFile?: Multer.File[];
      variantImages?: Multer.File[];
    },
  ) {
    try {
      // ✅ Parse JSON fields (tags, attributes, variants[])
      const parsedTags =
        typeof createProductDto.tags === 'string'
          ? JSON.parse(createProductDto.tags)
          : createProductDto.tags;

      const parsedVariants =
        typeof createProductDto.productVariants === 'string'
          ? JSON.parse(createProductDto.productVariants)
          : createProductDto.productVariants;

      // ✅ Attach images to variants by index
      const variantsWithImages = parsedVariants.map((variant, index) => ({
        ...variant,
        imageFile: files.variantImages?.[index] ?? null,
      }));

      // ✅ Final product payload
      const productPayload = {
        ...createProductDto,
        businessId,
        tags: parsedTags,
        productVariants: variantsWithImages,
        thumbnailFile: files.thumbnailFile?.[0] ?? null,
      };

      // ✅ Call service
      return this.productsService.createProductWithVariants(
        businessId,
        productPayload,
      );
    } catch (error) {
      throw new Error('Invalid JSON in product payload');
    }
  }

  /** Update an existing product */
  @HttpCode(HttpStatus.OK)
  @Patch('stores/:storeId/products/:productId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail_file', maxCount: 1 },
      { name: 'variantImages', maxCount: 20 },
    ]),
  )
  async updateProductWithVariants(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(new ValidationPipe({ transform: true }))
    updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      thumbnailFile?: Multer.File[];
      variantImages?: Multer.File[];
    },
  ) {
    try {
      // ✅ Parse JSON fields (tags, attributes, variants, variantsToDelete)

      const thumbnailFile = files?.thumbnailFile?.[0] ?? null;
      const parsedTags =
        typeof updateProductDto.tags === 'string'
          ? JSON.parse(updateProductDto.tags)
          : updateProductDto.tags || [];

      const parsedVariants =
        typeof updateProductDto.productVariants === 'string'
          ? JSON.parse(updateProductDto.productVariants)
          : updateProductDto.productVariants;

      const parsedRemovedVariantsIds =
        typeof updateProductDto.removedVariantIds === 'string'
          ? JSON.parse(updateProductDto.removedVariantIds)
          : updateProductDto.removedVariantIds || [];

      // ✅ Attach images to variants by index
      const variantsWithImages =
        parsedVariants?.map((variant) => {
          const idx = variant.imageFile;
          if (typeof idx === 'number' && files.variantImages?.[idx]) {
            variant.imageFile = files.variantImages[idx];
          }
          return variant;
        }) || [];

      // ✅ Final product payload
      const productPayload = {
        ...updateProductDto,
        store_id: storeId,
        tags: parsedTags,
        productVariants: variantsWithImages,
        removedVariantIds: parsedRemovedVariantsIds,
        thumbnailFile,
      };

      return this.productsService.updateProductWithVariants(
        productId,
        productPayload,
        storeId,
      );
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Invalid JSON in product payload');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get('stores/:storeId/categories')
  async findStoreCategories(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.productsService.findStoreCatgories(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':businessId/products')
  async findAllProductsByBusiness(
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.productsService.findAllProductsByBusiness(businessId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('stores/:storeId/products/:productId')
  async findProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.productsService.findProduct(productId, storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('stores/:storeId/products')
  async findAllProductsByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.productsService.findAllProductsByStore(storeId);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':businessId/products/:productId')
  async deleteProduct(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.deleteProductWithVariants(
      productId,
      businessId,
    );
  }
}
