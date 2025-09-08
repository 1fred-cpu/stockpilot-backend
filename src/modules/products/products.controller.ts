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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Create a new product */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'variantImages', maxCount: 20 },
    ]),
  )
  async createProduct(
    @Param('businessId') businessId: string,
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
        businessId,
        tags: parsedTags,
        variants: variantsWithImages,
        thumbnail: files.thumbnail?.[0] ?? null,
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

  @Post('business/:businessId')
  createProductWithVariants(
    @Param('businessId') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createProductWithVariants(businessId, dto);
  }

  @Get('business/:businessId')
  findAll(@Param('businessId') businessId: string) {
    return this.productsService.findAllByBusiness(businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
