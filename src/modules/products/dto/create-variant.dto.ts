import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsDateString,
  IsArray,
} from 'class-validator';

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
  image_url: string;

  @IsOptional()
  @IsArray()
  attributes: Record<string, any>[];

  @IsOptional()
  @IsString()
  image_file: string; // base64 string or file path, depending on frontend

  @IsOptional()
  @IsDateString()
  expiry_date?: string; // optional for non-food products
}
