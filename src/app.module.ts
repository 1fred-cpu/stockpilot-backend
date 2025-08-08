import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StoresModule } from './modules/stores/stores.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from 'lib/supabase.module';
@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    StoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
