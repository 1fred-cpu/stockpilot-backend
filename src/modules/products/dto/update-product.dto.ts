import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { Multer } from 'multer';
export class UpdateProductDto extends PartialType(CreateProductDto) {
  thumbnail?: Multer.File;
}
