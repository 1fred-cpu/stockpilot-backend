import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  async createStore(@Body(ValidationPipe) createStoreDto: CreateStoreDto) {
    return this.storesService.createStore(createStoreDto);
  }

  @Get(':storeId')
  async findStore(@Param('storeId') storeId: string) {
    return this.storesService.findStore(storeId);
  }

  @Patch(':storeId')
  async updateStore(
    @Param('storeId') storeId: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(storeId, updateStoreDto);
  }
}
