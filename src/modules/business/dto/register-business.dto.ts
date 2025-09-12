// dto/register-business.dto.ts
import {
  IsString,
  IsObject,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Multer } from 'multer';

export class RegisterBusinessDto {
  @IsString()
  @IsNotEmpty()
  owner_user_id: string; // ID of the user who signed up

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  store_name: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  owner_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  website: string;

  @IsOptional()
  image_file: Multer.File;
}
