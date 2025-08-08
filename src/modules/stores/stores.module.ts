import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SupabaseModule } from 'lib/supabase.module';
@Module({
  controllers: [StoresController],
  providers: [StoresService],
  imports: [SupabaseModule],
})
export class StoresModule {}
