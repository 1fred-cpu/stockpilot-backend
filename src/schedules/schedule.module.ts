import { Module } from "@nestjs/common";
import { InviteCleanupService } from "./invite-cleanup.service";
import { SupabaseModule } from "src/lib/supabase.module";
import { FileCleanupService } from "./file-cleanup.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import { FailedFileDeletion } from "../entities/failed-file-deletion.entity";

@Module({
    imports: [SupabaseModule, TypeOrmModule.forFeature([FailedFileDeletion])],
    providers: [InviteCleanupService, FileCleanupService]
})
export class SchedulesServiceModule {}
