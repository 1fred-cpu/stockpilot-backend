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
import { Transform, Type } from "class-transformer";

class RestockVariantDto {
    @IsUUID()
    variantId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsInt()
    costPrice?: number;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class RestockDto {
    @IsUUID()
    storeId: string;

    @IsUUID()
    businessId: string;

    @IsString()
    restockedBy: string;

    @IsOptional()
    @IsString()
    idempotencyKey?: string;

    // 🔹 If you want ONE reference per restock operation, keep it here:
    @IsOptional()
    @IsString()
    reference?: string;

    @ArrayMinSize(1)
    @Transform(({ value }) => {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value; // ✅ ensures array/object is preserved
    })
    @ValidateNested({ each: true })
    @Type(() => RestockVariantDto)
    variants: RestockVariantDto[];
}
