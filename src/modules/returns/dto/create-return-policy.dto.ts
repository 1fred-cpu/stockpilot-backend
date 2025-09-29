import {
  IsUUID,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateReturnPolicyDto {
  @IsUUID()
  storeId: string;

  @IsInt()
  @Min(1)
  daysAllowed: number;

  @IsBoolean()
  allowRefund: boolean;

  @IsBoolean()
  allowExchange: boolean;

  @IsBoolean()
  allowStoreCredit: boolean;

  @IsBoolean()
  requireReceipt: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  restockingFee: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxItemsPerReturn: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
