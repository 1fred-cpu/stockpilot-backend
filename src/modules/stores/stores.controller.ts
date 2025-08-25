import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Multer } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Create a new store (with file upload)
   */
  @HttpCode(HttpStatus.OK)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createStore(
    @Body(ValidationPipe) createStoreDto: CreateStoreDto,
    @UploadedFile() file: Multer.File,
  ) {
    return this.storesService.createStore(createStoreDto, file);
  }

  /**
   * Get all stores (optional query filters: limit, page, ownerId, businessType)
   */
  @HttpCode(200)
  @Get()
  async findAllStores(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('ownerId') ownerId?: string,
    @Query('businessType') businessType?: string,
  ) {
    return this.storesService.findAllStores({
      limit,
      page,
      ownerId,
      businessType,
    });
  }

  /**
   * Get a single store by owner ID
   */
  @HttpCode(HttpStatus.OK)
  @Get()
  async findStoreWithOwnerId(@Query('ownerId') ownerId: string) {
    return this.storesService.findStoreWithOwnerId(ownerId);
  }
  /**
   * Get a single store by ID
   */
  @HttpCode(HttpStatus.OK)
  @Get(':storeId')
  async findStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.findStore(storeId);
  }

  /**
   * Update a store by ID
   */
  @HttpCode(200)
  @Patch(':storeId')
  async updateStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) updateStoreDto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(storeId, updateStoreDto);
  }

  /**
   * Delete a store by ID
   */
  @HttpCode(200)
  @Delete(':storeId')
  async deleteStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.deleteStore(storeId);
  }
}
