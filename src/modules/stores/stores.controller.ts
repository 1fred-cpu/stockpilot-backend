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
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Create a new store
   */
  @HttpCode(201)
  @Post()
  async createStore(@Body(ValidationPipe) createStoreDto: CreateStoreDto) {
    return this.storesService.createStore(createStoreDto);
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
   * Get a single store by ID
   */
  @HttpCode(200)
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
