import { IsUUID, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SaleItemDto {
  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @Min(0)
  discount?: number;
}
