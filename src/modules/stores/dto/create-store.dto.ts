import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsEmail,
    IsPhoneNumber,
    IsUrl,
    IsUUID,
    ArrayNotEmpty
} from "class-validator";
import { Express } from "express";
import { Multer } from "multer";

export class CreateStoreDto {
    @IsUUID()
    businessId: string;

    @IsUUID()
    ownerId: string;

    @IsString()
    @IsNotEmpty()
    storeName: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    currency: string;

    @IsString()
    @IsNotEmpty()
    location: string;

    @IsEmail()
    email: string;

    @IsPhoneNumber()
    phone: string;
}
