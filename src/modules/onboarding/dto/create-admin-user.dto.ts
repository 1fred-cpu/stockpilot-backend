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
    full_name: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsEmail()
    email: string;

    @IsPhoneNumber()
    phone_number: string;

    @IsUrl()
    avatar_url: string;

    @IsUUID()
    store_id: string;
}
