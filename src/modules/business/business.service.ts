// business.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { KafkaHelper } from '../../helpers/kafka.heper';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class BusinessService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly kafkaHelper: KafkaHelper,
    private readonly errorHandler: HandleErrorService,
  ) {}

  async registerBusiness(dto: RegisterBusinessDto) {
    try {
      // 1. Check if business exists
      if (await this.doBusinessExists(dto.business_name, dto.owner_user_id)) {
        throw new ConflictException(
          'Business with this name and user already exists',
        );
      }
      const businessId = uuidv4();
      const storeId = uuidv4();
      const now = new Date().toISOString();

      // 1. Create Business
      const business = {
        id: businessId,
        name: dto.business_name,
        owner_user_id: dto.owner_user_id,
        created_at: now,
      };

      const { error: bizError } = await this.supabase
        .from('businesses')
        .insert([business]);

      if (bizError) throw new BadRequestException(bizError.message);

      // Emit BusinessCreated event
      await this.kafkaHelper.emitEvent(
        'business.events',
        businessId,
        'BusinessCreated',
        business,
      );

      // 2. Create Default Store
      const store = {
        id: storeId,
        business_id: businessId,
        name: dto.store_name,
        timezone: dto.timezone,
        currency: dto.currency,
        created_at: now,
      };

      const { error: storeError } = await this.supabase
        .from('stores')
        .insert([store]);

      if (storeError) throw new BadRequestException(storeError.message);

      // Emit StoreCreated event
      await this.kafkaHelper.emitEvent(
        'store.events',
        businessId,
        'StoreCreated',
        store,
      );

      return {
        business,
        store,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'registerBusiness');
    }
  }

  /** Helpers */
  private async doBusinessExists(
    name: string,
    ownerUserId: string,
  ): Promise<boolean> {
    const { data: business, error: fetchError } = await this.supabase
      .from('business')
      .select('id')
      .match({ owner_user_id: ownerUserId, name })
      .maybeSingle();

    if (fetchError) {
      throw new BadRequestException(fetchError.message);
    }
    if (business) {
      return true;
    } else {
      return false;
    }
  }
}
