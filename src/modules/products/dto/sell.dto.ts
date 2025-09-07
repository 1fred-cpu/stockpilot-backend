import { IsString, IsNumber } from 'class-validator';

export class SellDto {
  @IsString()
  variant_id: string;

  @IsNumber()
  quantity: number;
}
