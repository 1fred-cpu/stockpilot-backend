import {
    IsUUID,
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    Min,
    IsObject,
    IsEmail,
    IsArray,
    IsPhoneNumber,
    ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class Customer {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsPhoneNumber()
    phoneNumber: string;
}
export class Sale {
    @IsUUID()
    productId: string;

    @IsUUID()
    variantId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsNumber()
    @Min(0)
    pricePerUnit: number;

    @IsNumber()
    @Min(0)
    totalPrice: number;
    //
    //     @IsOptional()
    //     @IsString()
    //     customer?: string;

    @IsUUID()
    inventoryId: string;

    @IsString()
    idempotencyKey: string;

    @IsString()
    type: string;

    @IsObject()
    customer: Customer;
}

export class CreateSaleDto {
    @IsUUID()
    storeId: string;

    @IsDateString()
    saleDate: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Sale)
    sales: Sale[];
}


