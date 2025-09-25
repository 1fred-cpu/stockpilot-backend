import {
    IsUUID,
    IsInt,
    Min,
    IsOptional,
    ValidateNested,
    ArrayMinSize,
    IsArray,
    IsString
} from "class-validator";
import { Type } from "class-transformer";

export class DeductStockItemDto {
    @IsUUID()
    storeId: string;

    @IsUUID()
    businessId: string;

    @IsUUID()
    variantId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsString()
    reason?: string; // e.g., "sale", "wastage", "return"

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    createdBy?: string;
}

export class DeductStockDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => DeductStockItemDto)
    deductions: DeductStockItemDto[];

    @IsOptional()
    @IsString()
    idempotencyKey?: string; // prevents duplicate bulk deductions
}
