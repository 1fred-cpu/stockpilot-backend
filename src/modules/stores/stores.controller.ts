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
import { SendInviteDto } from './dto/send-invite.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { Multer } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStoreUsersDto } from './dto/update-store-users.dto';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Create a store
   * @param createStoreDto
   * @returns Store object
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createStore(@Body(ValidationPipe) createStoreDto: CreateStoreDto) {
    return this.storesService.createStore(createStoreDto);
  }

  /**
   * Send a invite email
   * @param sendInviteDto
   * @returns a invite data
   */
  @HttpCode(HttpStatus.CREATED)
  @Post(':storeId/send-invite')
  async sendInvite(
    @Body(ValidationPipe) sendInviteDto: SendInviteDto,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.storesService.sendInvite(storeId, sendInviteDto);
  }
  /**
   * create a user from invite
   * @param storeId
   * @param inviteUserDto
   * @returns a message
   */

  @HttpCode(HttpStatus.CREATED)
  @Post(':storeId/accept-invite')
  async acceptInvite(
    @Body(ValidationPipe) inviteUserDto: InviteUserDto,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<any> {
    return this.storesService.acceptInvite(storeId, inviteUserDto);
  }

  /**
   *  Find a store
   * @param storeId
   * @returns a store
   */
  @HttpCode(HttpStatus.OK)
  @Get(':storeId')
  async findStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.findStore(storeId);
  }

  /**
   *  Finds all stores
   * @param businessId
   * @returns all stores
   */
  @HttpCode(HttpStatus.OK)
  @Get(':businessId/all')
  async findAllStores(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.storesService.findAllStores(businessId);
  }

  /**
   *  Finds all categories that belongs to store
   * @param businessId
   * @returns Finds all categories that belongs to store
   */
  @HttpCode(HttpStatus.OK)
  @Get(':storeId/categories')
  async findStoreCategories(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.getStoreProductsCategories(storeId);
  }

  /**
   *  Find store and update
   * @param storeId
   * @returns updated store
   */
  @HttpCode(HttpStatus.OK)
  @Patch(':storeId')
  async updateStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(storeId, dto);
  }
  /**
   *  Update store users
   * @param storeId
   */
  @HttpCode(HttpStatus.OK)
  @Patch(':storeId/users')
  async updateStoreUsers(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: UpdateStoreUsersDto,
  ) {
    return this.storesService.updateStoreUsers(storeId, dto);
  }

  /**
   *  Find user and update
   * @param userId
   * @param businessId
   * @param dto
   * @returns a message
   */
  @HttpCode(HttpStatus.OK)
  @Patch('/businesses/:businessId/users/:userId')
  async updateUser(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) dto: UpdateUserDto,
  ): Promise<{ message: string }> {
    return this.storesService.updateUser(userId, businessId, dto);
  }

  /**
   *  Find store and delete
   * @param storeId
   * @returns deleted store
   */
  @HttpCode(HttpStatus.OK)
  @Delete(':storeId')
  async deleteStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.deleteStore(storeId);
  }
}
