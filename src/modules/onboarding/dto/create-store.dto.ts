import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateStoreDto {

  @IsString()
  @IsNotEmpty()
  store_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

  @IsArray()
  @IsNotEmpty()
  platforms: string[];

  @IsEmail()
  contact_email: string;

  @IsPhoneNumber()
  contact_phone: string;

  @IsUrl()
  logo_url: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}
