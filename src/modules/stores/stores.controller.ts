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
import { Multer } from "multer";
import { FileInterceptor } from "@nestjs/platform-express";
import { Store } from "./entities/store.entity";
import { Categories } from "src/entities/category.entity";
import { Invite } from "src/entities/invite.entity";

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
    async createStore(
        @Body(ValidationPipe) createStoreDto: CreateStoreDto
    ): Promise<Store | undefined> {
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
        @Param("storeId") storeId: string
    ): Promise<Invite | undefined> {
        return this.storesService.sendInvite({
            ...sendInviteDto,
            store_id: storeId
        });
    }

    /**
     *  Find a store
     * @param storeId
     * @returns a store
     */
    @HttpCode(HttpStatus.OK)
    @Get(":storeId")
    async findStore(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ): Promise<Store | undefined> {
        return this.storesService.findStore(storeId);
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
    ): Promise<Store[] | undefined> {
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
    ): Promise<Categories | undefined> {
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
    ): Promise<Store | undefined> {
        return this.storesService.updateStore(storeId, dto);
    }

    /**
     *  Find store and delete
     * @param storeId
     * @returns deleted store
     */
    @HttpCode(HttpStatus.OK)
    @Delete(":storeId")
    async deleteStore(
        @Param("storeId", ParseUUIDPipe) storeId: string
    ): Promise<Store | undefined> {
        return this.storesService.deleteStore(storeId);
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
