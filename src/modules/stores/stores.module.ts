import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { MailModule } from 'src/utils/mail/mail.module';
import { UserEventsListener } from '../../event-listeners/user-events.listener';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [StoresController],
  providers: [
    StoresService,
    FileUploadService,
    HandleErrorService,
    UserEventsListener,
    EventEmitterHelper,
  ],
})
export class StoresModule {}
