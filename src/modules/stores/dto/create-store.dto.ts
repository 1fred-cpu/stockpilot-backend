import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
} from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  owner_id: string;

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
  @IsString()
  @IsNotEmpty()
  logo_url: string;

  @IsString()
  @IsNotEmpty()
  location: string;
}
