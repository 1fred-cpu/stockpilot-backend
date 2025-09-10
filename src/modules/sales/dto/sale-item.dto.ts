import { IsUUID, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SaleItemDto {
  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsOptional()
  discount?: number;
}
