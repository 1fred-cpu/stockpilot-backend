// dto/invite-user.dto.ts
import { IsEmail, IsString, IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  role: string; // cashier, manager, etc.

  @IsString()
  password: string;

  @IsUUID()
  business_id: string;
}
