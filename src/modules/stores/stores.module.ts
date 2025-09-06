import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { MailModule } from 'src/utils/mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [StoresController],
  providers: [StoresService, FileUploadService, HandleErrorService],
})
export class StoresModule {}
