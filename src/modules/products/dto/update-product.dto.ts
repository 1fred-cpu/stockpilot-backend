import { PartialType } from "@nestjs/mapped-types";
import { CreateProductDto } from "./create-product.dto";
import { Multer } from "multer";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateProductDto extends CreateProductDto {
  
}
