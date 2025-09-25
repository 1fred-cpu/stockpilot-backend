import {
    IsString,
    IsEmail,
    IsUUID,
    IsOptional,
    IsNotEmpty
} from "class-validator";

export class SendInviteDto {
    @IsUUID()
    storeId?: string;

    @IsUUID()
    businessId: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsNotEmpty()
    invitedBy: string;
}
