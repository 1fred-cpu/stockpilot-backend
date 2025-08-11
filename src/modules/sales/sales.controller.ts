import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Res,
    ValidationPipe
} from "@nestjs/common";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { Response } from "express";

@Controller("sales")
export class SalesController {
    constructor(private readonly salesService: SalesService) {}

    @Post()
    async createSale(
        @Body(ValidationPipe) createSaleDto: CreateSaleDto,
        
    ) {
        return this.salesService.createSale(createSaleDto);
    }

    @Get()
    findAll() {
        return this.salesService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.salesService.findOne(+id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() updateSaleDto: UpdateSaleDto) {
        return this.salesService.update(+id, updateSaleDto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.salesService.remove(+id);
    }
}
