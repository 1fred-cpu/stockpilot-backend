import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppDataSource } from '../config/data-source';

@Injectable()
export class MigrationService implements OnModuleInit {
  async onModuleInit() {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      await AppDataSource.runMigrations();
      console.log('✅ Migrations executed successfully on startup');
    } catch (error) {
      console.error('❌ Error running migrations on startup:', error);
    }
  }
}
