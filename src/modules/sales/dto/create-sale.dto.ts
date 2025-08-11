import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
} from 'class-validator';

export class Sale {
  @IsUUID()
  product_id: string;

  @IsUUID()
  variant_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price_per_unit: number;

  @IsNumber()
  @Min(0)
  total_price: number;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsUUID()
  inventory_id: string;

  @IsString()
  idempotency_key: string;

  @IsString()
  type: string;
}
export class CreateSaleDto {
  @IsUUID()
  store_id: string;

  @IsDateString()
  sale_date: string;

  @IsArray()
  sales: Sale[];
}
