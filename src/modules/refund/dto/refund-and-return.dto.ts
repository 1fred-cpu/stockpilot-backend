import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class ReturnItemDto {
  sale_item_id: string;
  quantity: number;
  reason?: string;
}
export class RefundAndReturnDto {
  @IsUUID()
  sale_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  return_items: ReturnItemDto[];

  @IsNumber()
  @Min(0)
  refund_amount: number;

  @IsOptional()
  @IsString()
  reason: string;
}
