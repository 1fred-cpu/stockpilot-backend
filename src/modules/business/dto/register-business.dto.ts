// dto/register-business.dto.ts
import {
  IsString,
  IsObject,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { Multer } from 'multer';
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

  @IsString()
  owner_name: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  website: string;

  @IsOptional()
  image_file: Multer.File;
}
