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
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  low_stock_threshold: number;

  @IsOptional()
  @IsString()
  image_url: string; // base64 string or file path, depending on frontend

  @IsOptional()
  @IsString()
  image_file: string;

  @IsOptional()
  @IsArray()
  attributes: Record<string, any>[];

  @IsOptional()
  @IsDateString()
  expiry_date?: string; // optional for non-food products
}

export class CreateProductDto {
  @IsUUID()
  business_id: string;

  @IsUUID()
  store_id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsBoolean()
  track_batches?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
