import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class RefundSaleDto {
  @IsUUID()
  sale_id: string;

  @IsUUID()
  variant_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  reason?: string;

  @IsOptional()
  created_by?: string;
}
