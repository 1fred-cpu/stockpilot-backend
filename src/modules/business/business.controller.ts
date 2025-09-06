// business.controller.ts
import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async registerBusiness(@Body(ValidationPipe) dto: RegisterBusinessDto) {
    return this.businessService.registerBusiness(dto);
  }
}
