import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  IsUUID,
  ArrayNotEmpty,
} from 'class-validator';
import { Express } from 'express';
import { Multer } from 'multer';

export class CreateStoreDto {
  @IsUUID()
  business_id: string;

  @IsUUID()
  owner_id: string;

  @IsString()
  @IsNotEmpty()
  store_name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;
}
