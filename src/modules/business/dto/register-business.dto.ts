// dto/register-business.dto.ts
import {
    IsString,
    IsObject,
    IsEmail,
    IsPhoneNumber,
    IsOptional,
    IsNotEmpty
} from "class-validator";
import { Multer } from "multer";

export class RegisterBusinessDto {
    @IsString()
    @IsNotEmpty()
    owner_user_id: string; // ID of the user who signed up

    @IsString()
    @IsNotEmpty()
    business_name: string;

    @IsPhoneNumber()
    business_phone: string;

    @IsEmail()
    business_email: string;

    @IsString()
    @IsNotEmpty()
    store_name: string;

    @IsString()
    @IsNotEmpty()
    currency: string;

    @IsString()
    @IsNotEmpty()
    location: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsEmail()
    store_email: string;

    @IsPhoneNumber()
    store_phone: string;

    @IsOptional()
    @IsString()
    website?: string;

    @IsOptional()
    image_file?: Multer.File;
}
