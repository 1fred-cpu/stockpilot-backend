import { IsString, IsEmail, IsUUID, IsOptional } from "class-validator";

export class SendInviteDto {
    @IsOptional()
    @IsUUID()
    store_id?: string;
    
    @IsUUID()
    business_id: string;
    
    @IsEmail()
    email:string;
    
    @IsString()
    role:string;
    
    @IsString()
    store_name:string;
    
    @IsString()
    invitedBy:string;
    
    @IsString()
    location:string;
}
