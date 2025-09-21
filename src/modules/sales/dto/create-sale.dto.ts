import {
  IsUUID,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleItemDto } from './sale-item.dto';

export class CreateSaleDto {
  @IsUUID()
  store_id: string;

  @IsUUID()
  business_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsNumber()
  total_amount: number;

  @IsOptional()
  payment_method?: string;

  @IsOptional()
  reference?: string;

  @IsOptional()
  created_by?: string;

  @IsString()
  idempotency_key: string;

  @IsOptional()
  customer?: {
    name: string | undefined;
    email: string | undefined;
    phone: string | undefined;
  };
}
