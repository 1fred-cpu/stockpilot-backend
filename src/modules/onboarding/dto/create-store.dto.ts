import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsEmail,
    IsPhoneNumber,
    IsUrl,
    IsUUID
} from "class-validator";

export class CreateStoreDto {
    @IsString()
    @IsNotEmpty()
    storeName: string;

    @IsString()
    @IsNotEmpty()
    businessType: string;

    @IsArray()
    @IsNotEmpty()
    platforms: string[];

    @IsEmail()
    contactEmail: string;

    @IsPhoneNumber()
    contactPhone: string;

    @IsUrl()
    logoUrl: string;

    @IsString()
    @IsNotEmpty()
    location: string;
}
