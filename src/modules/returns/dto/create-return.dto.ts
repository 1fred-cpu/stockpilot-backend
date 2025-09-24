import {
    IsUUID,
    IsString,
    IsIn,
    IsOptional,
    IsNumber,
    Min,
    IsArray,
    ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export class ReturnItemDto {
    @IsUUID()
    saleItemId: string;

    @IsString()
    reason: string;

    @IsIn(["refund", "exchange", "store_credit"])
    resolution: "refund" | "exchange" | "store_credit";

    @IsOptional()
    @IsUUID()
    newProductVariantId?: string; // only for exchange

    @IsOptional()
    @IsNumber()
    @Min(1)
    quantity?: number; // partial quantity return allowed
}

export class CreateReturnDto {
    @IsUUID()
    storeId: string;
    
    @IsUUID()
    saleId: string;

    @IsOptional()
    @IsUUID()
    staffId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnItemDto)
    items: ReturnItemDto[];
}
