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

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.storesService.findOne(+id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() updateStoreDto: UpdateStoreDto) {
        return this.storesService.update(+id, updateStoreDto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.storesService.remove(+id);
    }
}
