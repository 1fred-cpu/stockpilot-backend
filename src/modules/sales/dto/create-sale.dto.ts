import {
  IsUUID,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleItemDto } from './sale-item.dto';

export enum DeliveryChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PRINTER = 'print',
}

export class CreateSaleDto {
  @IsUUID()
  storeId: string;

  @IsUUID()
  businessId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsNumber()
  totalAmount: number;

  @IsOptional()
  paymentMethod?: string;

  @IsOptional()
  reference?: string;

  @IsUUID()
  createdBy?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  customer?: {
    name: string | undefined;
    email: string | undefined;
    phone: string | undefined;
  };

  @IsOptional()
  @IsBoolean()
  isRecieptNeeded: boolean;

  @IsOptional()
  @IsEnum(DeliveryChannel, {
    message: `deliveryChannel must be one of: ${Object.values(DeliveryChannel).join(', ')}`,
  })
  deliveryChannel?: DeliveryChannel;
}
