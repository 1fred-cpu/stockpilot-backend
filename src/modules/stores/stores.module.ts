import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SupabaseModule } from 'lib/supabase.module';
import { FileUploadService } from 'utils/upload-file';
@Module({
  controllers: [StoresController],
  providers: [StoresService, FileUploadService],
  imports: [SupabaseModule],
})
export class StoresModule {}
