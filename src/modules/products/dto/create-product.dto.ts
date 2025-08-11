import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsNumber,
    IsObject,
    IsUrl,
    IsOptional
} from "class-validator";
export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    storeId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsUrl()
    thumbnail: string;

    @IsArray()
    @IsNotEmpty()
    tags: string[];

    @IsOptional()
    @IsObject()
    attributes: Record<string, any>;

    @IsArray()
    variants: Variant[];
}

export class Variant {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    product_id: string;

    @IsUrl()
    image_url: string;

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
    @IsNotEmpty()
    stock: number;

    @IsNumber()
    @IsNotEmpty()
    low_stock_threshold: number;

    @IsUrl()
    @IsNotEmpty()
    image_url: string;

    @IsString()
    @IsNotEmpty()
    sku: string;
}
