// business.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';

@Injectable()
export class BusinessService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly eventEmitterHelper: EventEmitterHelper,
    private readonly errorHandler: HandleErrorService,
  ) {}

  async registerBusiness(dto: RegisterBusinessDto) {
    try {
      // 1. Check if business exists
      if (await this.doBusinessExists(dto.business_name, dto.owner_user_id)) {
        throw new ConflictException(
          'A business with this name already exists under your account. Please choose a different name.',
        );
      }
      const {
        business_name,
        owner_user_id,
        location,
        currency,
        store_name,
        timezone,
      } = dto;
      const { name, email } = dto.owner;
      const businessId = uuidv4();
      const storeId = uuidv4();
      const now = new Date().toISOString();

      // 2. Create Business
      const business = {
        id: businessId,
        name: business_name,
        email,
        owner_user_id,
        created_at: now,
      };

      const { error: bizError } = await this.supabase
        .from('businesses')
        .insert([business]);

      if (bizError) throw new BadRequestException(bizError.message);

      // 3. Create owner user
      const user = await this.createOwner(
        businessId,
        owner_user_id,
        name,
        email,
      );

      // 4.Emit BusinessCreated event
      await this.eventEmitterHelper.emitEvent(
        'business.events',
        businessId,
        'BusinessCreated',
        business,
      );

      // 5. Create Default Store
      const store = {
        id: storeId,
        business_id: businessId,
        name: store_name,
        timezone,
        currency,
        location,
        created_at: now,
      };

      const { error: storeError } = await this.supabase
        .from('stores')
        .insert([store]);

      if (storeError) throw new BadRequestException(storeError.message);

      //Emit UserAssignedRole event
      await this.eventEmitterHelper.emitEvent(
        'user.events',
        businessId,
        'UserAssignedRole',
        {
          business_id: businessId,
          role: 'Admin',
          email,
          user_id: user.id,
          status: 'active',
          store_id: storeId,
        },
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
      .from('businesses')
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

  private async createOwner(
    businessId,
    ownerUserId,
    name,
    email,
  ): Promise<any> {
    const { data: existsUser, error: fetchError } = await this.supabase
      .from('users')
      .select('id')
      .match({
        email,
      })
      .maybeSingle();
    if (fetchError) {
      throw new BadRequestException(fetchError.message);
    }
    if (existsUser) {
      throw new NotFoundException('User already exists');
    }
    const { data: user, error: createError } = await this.supabase
      .from('users')
      .insert([
        {
          id: ownerUserId,
          business_id: businessId,
          status: 'active',
          name,
          email,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();
    if (createError) {
      throw new BadRequestException(createError.message);
    }
    return user;
  }
}
