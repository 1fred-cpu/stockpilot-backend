import { IsEmail,IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;
}
