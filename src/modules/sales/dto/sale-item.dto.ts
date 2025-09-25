import { IsUUID, IsInt, IsNumber, IsOptional, Min } from "class-validator";

export class SaleItemDto {
    @IsUUID()
    variantId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsNumber()
    @Min(0)
    unitPrice: number;

    @IsOptional()
    @Min(0)
    discount?: number;
}
