import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    IsUUID,
    Min,
    IsDateString,
    IsBoolean,
    IsObject
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { Multer } from "multer";

class Inventory {
    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @Min(0)
    low_stock_quantity: number;

    @IsNumber()
    @Min(0)
    reserved: number;
}
export class CreateVariantDto {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsString()
    name: string;

    @IsString()
    sku: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsObject()
    inventory: Inventory;

    @IsOptional()
    @IsString()
    image_url: string;

    @IsOptional()
    image_file: Multer.File;

    @IsOptional()
    @IsDateString()
    expiry_date?: string;
}

export class CreateProductDto {
    @IsOptional()
    @IsUUID()
    business_id: string;

    @IsString()
    business_name: string;

    @IsUUID()
    store_id: string;

    @IsString()
    name: string;

    @IsString()
    description?: string;
    
    @IsString()
    thumbnail: string;

    @IsOptional()
    thumbnail_file?: Multer.File;

    @IsString()
    category?: string;

    @IsString()
    brand?: string;

    @IsOptional()
    @IsBoolean()
    track_batches?: boolean;

    // 👇 Transform stringified JSON into an array
    @IsOptional()
    @IsArray()
    @Transform(({ value }) => {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value;
    })
    tags?: string[];

    // 👇 Variants also need parsing when sent as JSON string
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    @Transform(({ value }) => {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value;
    })
    product_variants: CreateVariantDto[];

    @IsOptional()
    @IsArray()
    @Transform(({ value }) => {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value;
    })
    removed_variant_ids: string[];
}
