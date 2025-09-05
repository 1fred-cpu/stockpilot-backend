import { Module } from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { PermissionController } from "./permission.controller";
import { SupabaseModule } from "../../lib/supabase.module";
import { HandleErrorService } from "src/helpers/handle-error.helper";

@Module({
    imports: [SupabaseModule],
    controllers: [PermissionController],
    providers: [PermissionService, HandleErrorService],
    exports: [PermissionService]
})
export class PermissionModule {}
