// dto/stock-change.dto.ts
import { IsUUID, IsInt, IsString, IsOptional } from 'class-validator';

export class StockChangeDto {
  @IsUUID() inventoryId: string;
  @IsInt() change: number;
  @IsString() type: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsUUID() referenceId?: string;
  @IsString() idempotencyKey: string;
  @IsOptional() @IsUUID() userId?: string;
}
