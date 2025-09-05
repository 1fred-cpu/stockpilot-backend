import { Module } from "@nestjs/common";
import { BusinessService } from "./business.service";
import { BusinessController } from "./business.controller";
import { SupabaseModule } from "src/lib/supabase.module";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { KafkaModule } from "../../config/kafka.module";
@Module({
    imports: [SupabaseModule, KafkaModule],
    controllers: [BusinessController],
    providers: [BusinessService, HandleErrorService]
})
export class BusinessModule {}
