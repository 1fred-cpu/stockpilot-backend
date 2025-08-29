import { Controller, Post, Body, ValidationPipe } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { StockChangeDto } from "./dto/stock-change.dto";
import { RestockChangeDto } from "./dto/restock-change.dto";

@Controller("inventory")
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Post("stock-move")
    async stockMove(@Body(ValidationPipe) dto: StockChangeDto) {
        return this.inventoryService.stockMove(dto);
    }
    @Post("restock-move")
    async restockMove(@Body(ValidationPipe) dto: RestockChangeDto) {
        return this.inventoryService.restockMove(dto);
    }
}
