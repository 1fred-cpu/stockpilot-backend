import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
} from 'class-validator';

export class ReviewReturnDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  returnIds: string[];

  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsOptional()
  @IsString()
  refundMethod?: string; // cash | card | store_credit
}
