import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsOptional,
    IsObject,
    ValidateNested,
    IsNumber
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { Multer } from "multer";

export class Variant {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    inventoryId?: string;

    @IsString()
    @IsNotEmpty()
    color: string;

    @IsString()
    @IsNotEmpty()
    size: string;

    @IsString()
    @IsNotEmpty()
    weight: string;

    @IsString()
    @IsNotEmpty()
    dimensions: string;

    @IsNumber()
    stock: number;

    @IsNumber()
    price: number;

    @IsNumber()
    lowStockThreshold: number;

    @IsNumber()
    reserved: number;

    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsOptional()
    imageFile?: Multer.File;
}export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  tags: string[];

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Variant)
  variants: Variant[];
}

