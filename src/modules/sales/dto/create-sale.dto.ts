import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateSaleDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsString()
  variant_sku?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price_per_unit: number;

  @IsNumber()
  @Min(0)
  total_price: number;

  @IsDateString()
  sale_date: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsUUID()
  store_id: string;
}
