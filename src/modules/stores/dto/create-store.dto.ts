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

export class CreateStoreDto {
    @IsUUID("4", { message: "Owner ID must be a valid UUID v4" })
    @IsNotEmpty({ message: "Owner ID is required" })
    ownerId: string;

    @IsString({ message: "Store name must be a string" })
    @IsNotEmpty({ message: "Store name is required" })
    storeName: string;

    @IsString({ message: "Business type must be a string" })
    @IsNotEmpty({ message: "Business type is required" })
    businessType: string;

    @IsArray({ message: "Platforms must be an array of strings" })
    @ArrayNotEmpty({ message: "Platforms list cannot be empty" })
    platforms: string[];

    @IsEmail({}, { message: "Contact email must be a valid email address" })
    contactEmail: string;

    @IsPhoneNumber(undefined, {
        message: "Contact phone must be a valid phone number"
    })
    contactPhone: string;

    @IsUrl({}, { message: "Logo URL must be a valid URL" })
    logoUrl: string;

    @IsString({ message: "Location must be a string" })
    @IsNotEmpty({ message: "Location is required" })
    location: string;
}
