import {
  IsUUID,
  IsString,
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnResolution } from 'src/entities/return.entity';

export class ReturnItemDto {
  @IsUUID()
  saleItemId: string;

  @IsString()
  reason: string;

  @IsEnum(ReturnResolution)
  resolution: ReturnResolution;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeItemDto)
  exchanges?: ExchangeItemDto[]; // Only for exchanges

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number; // partial quantity return allowed
}

export class ExchangeItemDto {
  newProductVariantId: string;
}

export class CreateReturnDto {
  @IsUUID()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  saleCode: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
