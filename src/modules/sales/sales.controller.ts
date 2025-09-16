import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ValidationPipe,
    Query,
    ParseUUIDPipe
} from "@nestjs/common";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";

@Controller("sales")
export class SalesController {
    constructor(private readonly salesService: SalesService) {}

    @Post()
    async createSale(@Body(ValidationPipe) createSaleDto: CreateSaleDto) {
        return this.salesService.createSale(createSaleDto);
    }

    @Get("stores/:storeId")
    async getSalesByDay(
        @Param("storeId", ParseUUIDPipe) storeId: string,
        @Query("date") date?: string
    ) {
        return this.salesService.getSalesByDay(storeId, date);
    }

    @Get("analytics")
    async getSalesAnalytics(
        @Query("storeId") storeId: string,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string
    ) {
        return this.salesService.getAnalytics(storeId, startDate, endDate);
    }
}
