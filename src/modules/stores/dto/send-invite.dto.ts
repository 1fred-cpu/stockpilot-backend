import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class SendInviteDto {
  @IsUUID()
  store_id?: string;

  @IsUUID()
  business_id: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  store_name: string;

  @IsString()
  @IsNotEmpty()
  invited_by: string;
}
