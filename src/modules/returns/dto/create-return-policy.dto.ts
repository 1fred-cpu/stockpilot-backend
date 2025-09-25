import { IsUUID, IsInt, Min, IsBoolean, IsOptional, IsString } from "class-validator";

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

  @IsOptional()
  @IsString()
  notes?: string;
}