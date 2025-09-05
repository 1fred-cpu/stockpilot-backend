// src/supabase/supabase.provider.ts
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const SupabaseProvider: Provider = {
  provide: 'SUPABASE_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const url = configService.get<string>('SUPABASE_URL');
    const key = configService.get<string>('SUPABASE_SERVICE_ROLE');
    if (!url || !key) {
      throw new Error('Missing Supabase URL or Key in environment variables');
    }

    return createClient(url, key);
  },
};
