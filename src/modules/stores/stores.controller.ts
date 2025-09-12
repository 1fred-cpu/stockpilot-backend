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
    UseInterceptors
} from "@nestjs/common";
import { StoresService } from "./stores.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { SendInviteDto } from "./dto/send-invite.dto";
import { InviteUserDto } from "./dto/invite-user.dto";
import { Multer } from "multer";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateUserDto } from "./dto/update-user.dto";
@Controller("stores")
export class StoresController {
    constructor(private readonly storesService: StoresService) {}

    /**
     * Create a store
     * @param createStoreDto
     * @returns Store
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
    @Post(":storeId/send-invite")
    async sendInvite(
        @Body(ValidationPipe) sendInviteDto: SendInviteDto,
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.storesService.sendInvite({
            ...sendInviteDto,
            store_id: storeId
        });
    }
    /**
     * create a user from invite
     * @param storeId
     * @param inviteUserDto
     * @returns a message
     */

    @HttpCode(HttpStatus.CREATED)
    @Post(":storeId/invite")
    async inviteUser(
        @Body(ValidationPipe) inviteUserDto: InviteUserDto,
        @Param("storeId", ParseUUIDPipe) storeId: string
    ): Promise<any> {
        return this.storesService.inviteUser(storeId, inviteUserDto);
    }

    /**
     *  Find a store
     * @param storeId
     * @returns a store
     */
    @HttpCode(HttpStatus.OK)
    @Get(":storeId")
    async findStore(@Param("storeId", ParseUUIDPipe) storeId: string) {
        return this.storesService.findStore(storeId);
    }

    /**
     *  Find a user from store
     * @param storeId
     * @param userId
     * @returns a user from store
     */
    @HttpCode(HttpStatus.OK)
    @Get(":storeId/users/:userId")
    async findUserFromStore(
        @Param("storeId", ParseUUIDPipe) storeId: string,
        @Param("userId", ParseUUIDPipe) userId: string
    ) {
        return this.storesService.getUserFromStore(storeId, userId);
    }

    /**
     *  Find all users from store
     * @param storeId
     * @returns all users from store
     */
    @HttpCode(HttpStatus.OK)
    @Get(":storeId/users")
    async findAllUsersFromStore(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.storesService.findAllUsersFromStore(storeId);
    }

    /**
     *  Find all users from business
     * @param storeId
     * @returns all users from business
     */
    @HttpCode(HttpStatus.OK)
    @Get("businesses/:businessId/users")
    async findAllUsersFromBusiness(
        @Param("businessId", ParseUUIDPipe) businessId: string
    ) {
        return this.storesService.findAllUsersFromBusiness(businessId);
    }

    /**
     *  Finds all stores
     * @param businessId
     * @returns all stores
     */
    @HttpCode(HttpStatus.OK)
    @Get(":businessId/all")
    async findAllStores(
        @Param("businessId", ParseUUIDPipe) businessId: string
    ) {
        return this.storesService.findAllStores(businessId);
    }

    /**
     *  Finds all categories that belongs to store
     * @param businessId
     * @returns Finds all categories that belongs to store
     */
    @HttpCode(HttpStatus.OK)
    @Get(":storeId/categories")
    async findStoreCategories(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ) {
        return this.storesService.getStoreProductsCategories(storeId);
    }

    /**
     *  Find store and update
     * @param storeId
     * @returns updated store
     */
    @HttpCode(HttpStatus.OK)
    @Patch(":storeId")
    async updateStore(
        @Param("storeId", ParseUUIDPipe) storeId: string,
        @Body(ValidationPipe) dto: UpdateStoreDto
    ) {
        return this.storesService.updateStore(storeId, dto);
    }

    /**
     *  Find user and update
     * @param userId
     * @param businessId
     * @param dto
     * @returns a message
     */
    @HttpCode(HttpStatus.OK)
    @Patch("/businesses/:businessId/users/:userId")
    async updateUser(
        @Param("businessId", ParseUUIDPipe) businessId: string,
        @Param("userId", ParseUUIDPipe) userId: string,
        @Body(ValidationPipe) dto: UpdateUserDto
    ): Promise<{ message: string }> {
        return this.storesService.updateUser(userId, businessId, dto);
    }

    /**
     *  Find store and delete
     * @param storeId
     * @returns deleted store
     */
    @HttpCode(HttpStatus.OK)
    @Delete(":storeId")
    async deleteStore(@Param("storeId", ParseUUIDPipe) storeId: string) {
        return this.storesService.deleteStore(storeId);
    }

    /**
     *  delete a user
     * @param storeId
     * @returns a message
     */
    @HttpCode(HttpStatus.OK)
    @Delete("businesses/:businessId/users/:userId")
    async deleteUserFromBusiness(
        @Param("businessId", ParseUUIDPipe) businessId: string,
        @Param("userId", ParseUUIDPipe) userId: string
    ): Promise<{ message: string } | undefined> {
        return this.storesService.removeUserCompletely(businessId, userId);
    }

    // /**
    //  * Get all stores (optional query filters: limit, page, ownerId, businessType)
    //  */
    // @HttpCode(200)
    // @Get()
    // async findAllStores(
    //   @Query('limit') limit?: number,
    //   @Query('page') page?: number,
    //   @Query('ownerId') ownerId?: string,
    //   @Query('businessType') businessType?: string,
    // ) {
    //   return this.storesService.findAllStores({
    //     limit,
    //     page,
    //     ownerId,
    //     businessType,
    //   });
    // }

    // /**
    //  * Get a store products categories by store ID
    //  */
    // @HttpCode(HttpStatus.OK)
    // @Get(':storeId/categories')
    // async getStoreProductsCategories(
    //   @Param('storeId', ParseUUIDPipe) storeId: string,
    // ) {
    //   return this.storesService.getStoreProductsCategories(storeId);
    // }
    // /**
    //  * Get a single store by ID
    //  */
    // @HttpCode(HttpStatus.OK)
    // @Get(':storeId')
    // async findStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    //   return this.storesService.findStore(storeId);
    // }

    // /**
    //  * Update a store by ID
    //  */
    // @HttpCode(200)
    // @Patch(':storeId')
    // async updateStore(
    //   @Param('storeId', ParseUUIDPipe) storeId: string,
    //   @Body(ValidationPipe) updateStoreDto: UpdateStoreDto,
    // ) {
    //   return this.storesService.updateStore(storeId, updateStoreDto);
    // }

    // /**
    //  * Delete a store by ID
    //  */
    // @HttpCode(200)
    // @Delete(':storeId')
    // async deleteStore(@Param('storeId', ParseUUIDPipe) storeId: string) {
    //   return this.storesService.deleteStore(storeId);
    // }
}
