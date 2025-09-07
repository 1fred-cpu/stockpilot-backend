import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class RestockDto {
  @IsString()
  variant_id: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string; // ISO date
}
