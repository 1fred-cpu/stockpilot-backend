import { Module } from "@nestjs/common";
import { QrcodeService } from "./qrcode.service";
import { QrcodeController } from "./qrcode.controller";
import { SupabaseModule } from "../../lib/supabase.module";
@Module({
    imports: [SupabaseModule],
    controllers: [QrcodeController],
    providers: [QrcodeService],
    exports: [QrcodeService],
})
export class QrcodeModule {}
