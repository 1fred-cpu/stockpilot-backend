import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class InviteUserDto {
  @IsUUID()
  @IsNotEmpty()
  invite_id: string;

  @IsUUID()
  @IsNotEmpty()
  business_id: string;

  @IsUUID()
  @IsNotEmpty()
  store_id: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  invited_by?: string;
}