import {
  IsUUID,
  IsArray,
  IsNumber,
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
  created_by?: string;

  @IsOptional()
  idempotency_key?: string;
}
