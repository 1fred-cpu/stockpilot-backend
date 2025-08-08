import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsNotEmpty()
  variants: Variant[];
}

class Variant {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsObject()
  @IsNotEmpty()
  attributes: Record<string, any>;

  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @IsString()
  @IsNotEmpty()
  slug: string;
}
