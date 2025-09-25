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
  ownerUserId: string; // ID of the user who signed up

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsPhoneNumber()
  businessPhone: string;

  @IsEmail()
  businessEmail: string;

  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsEmail()
  storeEmail: string;

  @IsPhoneNumber()
  storePhone: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  imageFile?: Multer.File;
}
