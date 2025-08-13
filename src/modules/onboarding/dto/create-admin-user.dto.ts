import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsEmail,
    IsPhoneNumber,
    IsUrl,
    IsUUID
} from "class-validator";

export class CreateAdminUserDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsEmail()
    email: string;

    @IsPhoneNumber()
    phoneNumber: string;

    @IsUrl()
    avatarUrl: string;

    @IsUUID()
    storeId: string;
}
