import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
  IsDateString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Multer } from 'multer';

class Inventory {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  lowStockQuantity: number;

  @IsNumber()
  @Min(0)
  reserved: number;
}
export class CreateVariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsObject()
  inventory: Inventory;

  @IsOptional()
  @IsString()
  imageUrl: string;

  @IsOptional()
  imageFile: Multer.File;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  imageFileIndex?: number;
}

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  businessId: string;

  @IsOptional()
  @IsString()
  businessName: string;

  @IsUUID()
  storeId: string;

  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsOptional()
  thumbnailFile?: Multer.File;

  @IsString()
  category?: string;

  @IsString()
  brand?: string;

  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  // 👇 Transform stringified JSON into an array
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  tags?: string[];

  // 👇 Variants also need parsing when sent as JSON string
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  productVariants: CreateVariantDto[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  removedVariantIds: string[];
}
