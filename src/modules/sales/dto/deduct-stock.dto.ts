import {
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeductStockItemDto {
  @IsUUID()
  store_id: string;

  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string; // e.g., "sale", "wastage", "return"

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  created_by?: string;
}

export class DeductStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeductStockItemDto)
  deductions: DeductStockItemDto[];

  @IsOptional()
  @IsString()
  idempotency_key?: string; // prevents duplicate bulk deductions
}
