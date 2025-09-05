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

// export class CreateStoreDto {
//   formData: FormData;
//   file: Multer.File;
// }

// class FormData {
//   @IsUUID('4', { message: 'Owner ID must be a valid UUID v4' })
//   @IsNotEmpty({ message: 'Owner ID is required' })
//   ownerId: string;

//   @IsString({ message: 'Store name must be a string' })
//   @IsNotEmpty({ message: 'Store name is required' })
//   storeName: string;

//   @IsString({ message: 'Business type must be a string' })
//   @IsNotEmpty({ message: 'Business type is required' })
//   businessType: string;

//   @IsEmail({}, { message: 'Contact email must be a valid email address' })
//   contactEmail: string;

//   @IsPhoneNumber(undefined, {
//     message: 'Contact phone must be a valid phone number',
//   })
//   @IsString({ message: 'Location must be a string' })
//   @IsNotEmpty({ message: 'Location is required' })
//   location: string;
// }

export class CreateStoreDto {
  @IsUUID()
  business_id: string;

  @IsString()
  store_name: string;

  @IsString()
  timezone: string;

  @IsString()
  currency: string;

  @IsString()
  location: string;
}
