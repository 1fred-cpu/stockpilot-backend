import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { VariantsService } from "./variants.service";
import { InventoryService } from "./inventory.service";
import { ProductsController } from "./products.controller";
import { VariantsController } from "./variants.controller";
import { InventoryController } from "./inventory.controller";
import { SupabaseModule } from "src/lib/supabase.module";
import { FileUploadService } from "src/utils/upload-file";
import { HandleErrorService } from "../../helpers/handle-error.helper";
import { DiscountsModule } from "../discounts/discounts.module";
@Module({
    imports: [SupabaseModule, DiscountsModule],
    controllers: [ProductsController],
    providers: [
        ProductsService,
        VariantsService,
        InventoryService,
        FileUploadService,
        HandleErrorService
    ],
    exports: [ProductsService, VariantsService, InventoryService]
})
export class ProductsModule {}
