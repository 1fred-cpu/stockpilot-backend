// dto/register-business.dto.ts
import { IsString, IsObject, IsEmail } from "class-validator";

class Owner {
    @IsString()
    name: string;
    @IsEmail()
    email: string;
}
export class RegisterBusinessDto {
    @IsString()
    owner_user_id: string; // ID of the user who signed up

    @IsString()
    business_name: string;

    @IsString()
    store_name: string;

    @IsString()
    timezone: string;

    @IsString()
    currency: string;

    @IsString()
    location: string;

    @IsObject()
    owner: Owner;
}
