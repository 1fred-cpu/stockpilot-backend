import {
    IsUUID,
    IsInt,
    Min,
    IsDateString,
    IsString,
    IsOptional,
    ValidateNested,
    ArrayMinSize
} from "class-validator";
import { Type } from "class-transformer";

class RestockVariantDto {
    @IsUUID()
    variant_id: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsInt()
    cost_price?: number;

    @IsOptional()
    @IsDateString()
    expires_at?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    reference?: string;
}

export class RestockDto {
    @IsUUID()
    store_id: string;

    @IsUUID()
    business_id: string;

    @IsString()
    restocked_by: string;

    @IsOptional()
    @IsString()
    idempotency_key: string;

    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => RestockVariantDto)
    variants: RestockVariantDto[];
}
