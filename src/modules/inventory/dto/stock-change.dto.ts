// dto/stock-change.dto.ts
import { IsUUID, IsInt, IsString, IsOptional } from "class-validator";

export class StockChangeDto {
    @IsUUID() inventory_id: string;
    @IsInt() change: number;
    @IsString() type: string;
    @IsOptional() @IsString() reason?: string;
    @IsOptional() @IsUUID() reference_id?: string;
    @IsString() idempotency_key: string;
    @IsOptional() @IsUUID() userId?: string;
}
