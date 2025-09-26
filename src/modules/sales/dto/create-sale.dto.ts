import {
  IsUUID,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleItemDto } from './sale-item.dto';

export class CreateSaleDto {
  @IsUUID()
  storeId: string;

  @IsUUID()
  businessId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsNumber()
  totalAmount: number;

  @IsOptional()
  paymentMethod?: string;

  @IsOptional()
  reference?: string;

  @IsUUID()
  createdBy?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  customer?: {
    name: string | undefined;
    email: string | undefined;
    phone: string | undefined;
  };
}
