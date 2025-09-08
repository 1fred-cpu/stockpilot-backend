import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Multer } from 'multer';
@Controller('variants')
export class VariantsController {
  constructor(private readonly svc: VariantsService) {}
// 
//   @Post()
//   @UseInterceptors(FileInterceptor('image'))
//   create(@Body() dto: CreateVariantDto, @UploadedFile() file: Multer.File) {
//     return this.svc.create(dto, file);
//   }
// 
//   @Get('product/:productId')
//   findByProduct(@Param('productId') productId: string) {
//     return this.svc.findByProduct(productId);
//   }
// 
//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.svc.findOne(id);
//   }
// 
//   @Patch(':id')
//   @UseInterceptors(FileInterceptor('image'))
//   update(
//     @Param('id') id: string,
//     @Body() dto: UpdateVariantDto,
//     @UploadedFile() file: Multer.File,
//   ) {
//     return this.svc.update(id, dto, file);
//   }
// 
//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.svc.remove(id);
//   }
}
