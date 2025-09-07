// business.controller.ts
import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  /**
   *
   * @param dto
   * @returns a business object
   */
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async registerBusiness(@Body(ValidationPipe) dto: RegisterBusinessDto) {
    return this.businessService.registerBusiness(dto);
  }

  /**
   *
   * @param businessId
   * @returns a message
   */
  @HttpCode(HttpStatus.OK)
  @Delete(':businessId')
  async deleteBusiness(
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ): Promise<{ message: string } | undefined> {
    return this.businessService.deleteBusiness(businessId);
  }
}
