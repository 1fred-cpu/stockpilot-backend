import { IsUUID, IsNumber, IsString } from 'class-validator';

export class PaymentDto {
  @IsUUID()
  sale_id: string;

  @IsString()
  method: string; // cash, card, momo

  @IsNumber()
  amount: number;

  @IsString()
  reference: string;
}
