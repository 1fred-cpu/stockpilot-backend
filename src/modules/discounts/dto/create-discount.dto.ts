import {
    IsString,
    IsUUID,
    IsOptional,
    IsNumber,
    IsDateString,
    IsBoolean
} from "class-validator";

export class CreateDiscountDto {
    @IsUUID()
    storeId: string;

    @IsString()
    name: string; // "Summer Sale"

    @IsString()
    type: "product" | "category" | "store";

    @IsString()
    discountType: "percentage" | "fixed";

    @IsNumber()
    value: number; // 10 = 10% or $10

    @IsOptional()
    @IsUUID()
    productId?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    minOrderAmount?: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}
