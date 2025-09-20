import {
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  IsString,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class RestockVariantDto {
  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsInt()
  cost_price?: number;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RestockDto {
  @IsUUID()
  store_id: string;

  @IsUUID()
  business_id: string;

  @IsString()
  restocked_by: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  // 🔹 If you want ONE reference per restock operation, keep it here:
  @IsOptional()
  @IsString()
  reference?: string;

  @ArrayMinSize(1)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value; // ✅ ensures array/object is preserved
  })
  @ValidateNested({ each: true })
  @Type(() => RestockVariantDto)
  variants: RestockVariantDto[];
}
