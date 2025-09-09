import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { VariantsService } from "./variants.service";
import { ProductsController } from "./products.controller";
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
        FileUploadService,
        HandleErrorService
    ],
    exports: [ProductsService, VariantsService]
})
export class ProductsModule {}
