import { IsInt, Min, IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateReturnPolicyDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    daysAllowed?: number;

    @IsOptional()
    @IsBoolean()
    allowRefund?: boolean;

    @IsOptional()
    @IsBoolean()
    allowExchange?: boolean;

    @IsOptional()
    @IsBoolean()
    allowStoreCredit?: boolean;

    @IsOptional()
    @IsString()
    notes?: string;
}
