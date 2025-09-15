// business.controller.ts
import {
  Controller,
  Post,
  Patch,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { Business } from '../../entities/business.entity';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image_file'))
  @Post('register')
  async registerBusiness(
    @Body(ValidationPipe) dto: RegisterBusinessDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.businessService.registerBusiness(dto, file);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':businessId')
  @UseInterceptors(FileInterceptor('file'))
  async updateBusiness(
    @Body(ValidationPipe) dto: Partial<Business>,
    @Param('businessId') businessId: string,
    @UploadedFile()
    file?: Multer.File,
  ) {
    return this.businessService.updateBusiness(businessId, dto, file);
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
