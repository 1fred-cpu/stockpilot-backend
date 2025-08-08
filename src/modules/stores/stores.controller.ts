import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ValidationPipe
} from "@nestjs/common";
import { StoresService } from "./stores.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { Throttle } from "@nestjs/throttler";
@Controller("stores")
export class StoresController {
    constructor(private readonly storesService: StoresService) {}

    @Post("create")
    async createStore(@Body(ValidationPipe) createStoreDto: CreateStoreDto) {
        return this.storesService.createStore(createStoreDto);
    }

    @Get(":store_id")
    async findStore(@Param("store_id") store_id: string) {
        return this.storesService.findStore(store_id);
    }

    @Patch(":store_id")
    async updateStore(
        @Param("store_id") store_id: string,
        @Body() updateStoreDto: UpdateStoreDto
    ) {
        return this.storesService.updateStore(store_id, updateStoreDto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.storesService.remove(+id);
    }
}
