// business.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { FileUploadService } from 'src/utils/upload-file';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business } from '../../entities/business.entity';
import { BillingService } from '../billing/billing.service';
import { Multer } from 'multer';
import { Store } from 'src/entities/store.entity';
import { StoreUser } from 'src/entities/store-user.entity';
import { User } from 'src/entities/user.entity';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class BusinessService {
  constructor(
    // @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,

    @Inject(forwardRef(() => BillingService))
    private readonly billingService: BillingService,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly errorHandler: HandleErrorService,
    private readonly fileService: FileUploadService,
  ) {}

  /**
   *
   * @param dto
   * @returns a business object
   */
  // async registerBusiness(dto: RegisterBusinessDto) {
  //   try {
  //     // 1. Check if business exists
  //     if (await this.doBusinessExists(dto.business_name, dto.owner_user_id)) {
  //       throw new ConflictException(
  //         'A business with this name already exists under your account. Please choose a different name.',
  //       );
  //     }
  //     const {
  //       business_name,
  //       owner_user_id,
  //       location,
  //       currency,
  //       store_name,
  //       timezone,
  //       website,
  //       address,
  //       phone,
  //       email,
  //       owner_name,
  //       image_file,
  //     } = dto;
  //     const businessId = uuidv4();
  //     const storeId = uuidv4();
  //     const now = new Date().toISOString();

  //     // 2. Upload business logo to storage and get url
  //     const path = `businesses/${business_name}/${uuidv4()}_${image_file.originalname}`;
  //     const image_url = await this.fileService.uploadFile(
  //       image_file,
  //       path,
  //       'logos',
  //     );

  //     // 2. Create Business
  //     const business = {
  //       id: businessId,
  //       name: business_name,
  //       email,
  //       website,
  //       phone,
  //       address,
  //       owner_user_id,
  //       logo_url: image_url,
  //       created_at: now,
  //       updated_at: now,
  //     };

  //     const { error: bizError } = await this.supabase
  //       .from('businesses')
  //       .insert([business]);

  //     if (bizError) throw new BadRequestException(bizError.message);

  //     // 3. Create owner user
  //     const user = await this.createOwner(
  //       businessId,
  //       owner_user_id,
  //       owner_name,
  //       email,
  //     );

  //     // 4.Emit BusinessCreated event
  //     await this.eventEmitterHelper.emitEvent(
  //       'business.events',
  //       businessId,
  //       'BusinessCreated',
  //       business,
  //     );

  //     // 5. Create Default Store
  //     const store = {
  //       id: storeId,
  //       business_id: businessId,
  //       name: store_name,
  //       timezone,
  //       currency,
  //       location,
  //       created_at: now,
  //     };

  //     const { error: storeError } = await this.supabase
  //       .from('stores')
  //       .insert([store]);

  //     if (storeError) throw new BadRequestException(storeError.message);

  //     //Emit UserAssignedRole event
  //     await this.eventEmitterHelper.emitEvent(
  //       'user.events',
  //       businessId,
  //       'UserAssignedRole',
  //       {
  //         business_id: businessId,
  //         role: 'Admin',
  //         email,
  //         user_id: user.id,
  //         status: 'active',
  //         store_id: storeId,
  //       },
  //     );

  //     return {
  //       business,
  //       store,
  //     };
  //   } catch (error) {
  //     this.errorHandler.handleServiceError(error, 'registerBusiness');
  //   }
  // }

  //   async registerBusiness(dto: RegisterBusinessDto) {
  //     try {
  //       if (await this.doBusinessExists(dto.business_name, dto.owner_user_id)) {
  //         throw new ConflictException(
  //           'A business with this name already exists under your account. Please choose a different name.',
  //         );
  //       }

  //       const {
  //         business_name,
  //         owner_user_id,
  //         location,
  //         currency,
  //         store_name,
  //         website,
  //         phone,
  //         email,
  //         owner_name,
  //         image_file,
  //       } = dto;

  //       const businessId = uuidv4();
  //       const storeId = uuidv4();

  //       // 1. Upload business logo
  //       const path = `businesses/${business_name}/${uuidv4()}_${
  //         image_file.originalname
  //       }`;
  //       const image_url = await this.fileService.uploadFile(
  //         image_file,
  //         path,
  //         'logos',
  //       );

  //       // 2. Call Supabase RPC
  //       const { data, error } = await this.supabase.rpc('register_business', {
  //         p_business_id: businessId,
  //         p_store_id: storeId,
  //         p_business_name: business_name,
  //         p_owner_user_id: owner_user_id,
  //         p_location: location,
  //         p_currency: currency,
  //         p_store_name: store_name,
  //         p_website: website,
  //         p_phone: phone,
  //         p_email: email,
  //         p_owner_name: owner_name,
  //         p_logo_url: image_url,
  //       });

  //       if (error) throw new BadRequestException(error.message);

  //       // 3. Emit events outside RPC (business.events, user.events)
  //       await this.eventEmitterHelper.emitEvent(
  //         'business.events',
  //         businessId,
  //         'BusinessCreated',
  //         data.business,
  //       );

  //       await this.eventEmitterHelper.emitEvent(
  //         'user.events',
  //         businessId,
  //         'UserAssignedRole',
  //         {
  //           business_id: businessId,
  //           role: 'Admin',
  //           email,
  //           user_id: data.owner.id,
  //           status: 'active',
  //           store_id: storeId,
  //         },
  //       );

  //       return data;
  //     } catch (error) {
  //       this.errorHandler.handleServiceError(error, 'registerBusiness');
  //     }
  //   }

  async registerBusiness(dto: RegisterBusinessDto, file?: Multer.File) {
    try {
      // 1. Check if business exists
      const existingBusiness = await this.findBusiness({
        name: dto.business_name,
        owner_user_id: dto.owner_user_id,
      });

      if (existingBusiness) {
        throw new ConflictException(
          'A business already exists with this crendentials',
        );
      }

      // 2. Define business payload
      const now = new Date();

      const business = {
        id: uuidv4(),
        name: dto.business_name,
        email: dto.email,
        owner_user_id: dto.owner_user_id,
        phone: dto.phone,
        logo_url: '',
        website: dto.website,
        stripe_customer_id: '',
        created_at: now,
        updated_at: now,
      };

      // 3. Define store payload
      const store = {
        id: uuidv4(),
        business_id: business.id,
        name: dto.store_name,
        location: dto.location,
        currency: dto.currency,
        created_at: now,
        updated_at: now,
      };

      // 3. Define a store user payload
      const storeUser = {
        id: uuidv4(),
        store_id: store.id,
        user_id: dto.owner_user_id,
        business_id: business.id,
        email: dto.email,
        role: 'Admin',
        status: 'active',
        assigned_at: now,
        created_at: now,
        updated_at: now,
      };

      // 4. Define a default user
      const ownerUser = {
        id: uuidv4(),
        name: dto.owner_name,
        email: dto.email,
        store_id: store.id,
        business_id: business.id,
        status: 'active',
        created_at: now,
        updated_at: now,
      };

      // 4. Create a stripe customer for business
      const customerStripeId = await this.billingService.createCustomer(
        business.id,
      );

      // 5. Upload logo image file to storage
      if (file) {
        const path = `businesses/${dto.business_name}/${uuidv4()}_${file.originalname}`;
        business.logo_url = await this.fileService.uploadFile(
          file,
          path,
          'logos',
        );
      }

      // 5.Update the stripe_customer_id in business payload
      business.stripe_customer_id = customerStripeId;

      // 6.Insert business, store and store_user in a transaction DB operations
      const results = await this.createBusinessWithStoreAndUser(
        business,
        store,
        storeUser,
        ownerUser,
      );
      return results;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'registerBusiness');
    }
  }

  //   /**
  //    *
  //    * @param businessId
  //    * @returns a message
  //    */
  //   async deleteBusiness(
  //     businessId: string,
  //   ): Promise<{ message: string } | undefined> {
  //     try {
  //       // 1. Check if business exists
  //       const { data: existingBusiness, error: existsError } = await this.supabase
  //         .from('businesses')
  //         .select('id')
  //         .eq('id', businessId)
  //         .maybeSingle();

  //       if (existsError) {
  //         throw new BadRequestException(existsError.message);
  //       }

  //       if (!existingBusiness) {
  //         throw new NotFoundException(
  //           'Cannot delete a business that is not found',
  //         );
  //       }

  //       // 2. Delete business
  //       const { error: deleteError } = await this.supabase
  //         .from('businesses')
  //         .delete()
  //         .eq('id', businessId);

  //       if (deleteError) {
  //         throw new BadRequestException(deleteError.message);
  //       }
  //       return {
  //         message: `Business with ID ${businessId} deleted successfully `,
  //       };
  //     } catch (error) {
  //       this.errorHandler.handleServiceError(error, 'deleteBusiness');
  //     }
  //   }

  /** Helpers */
  /**
   *
   * @param query
   * @returns A business object data
   */
  async findBusiness(query: Partial<Record<keyof Business, any>>) {
    const business = await this.businessRepo.findOne({
      where: query,
    });

    if (!business) {
      return null;
    }

    return business;
  }

  async updateBusiness(
    query: Partial<Record<keyof Business, any>>,
    dto: Partial<Business>,
  ) {
    // 1. Find the business first (to ensure it exists)
    const business = await this.businessRepo.findOne({ where: query });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // 2. Merge existing business with the incoming update
    const updatedBusiness = this.businessRepo.merge(business, dto);

    // 3. Save the changes
    return await this.businessRepo.save(updatedBusiness);
  }

  private async createBusinessWithStoreAndUser(
    businessData: Partial<Business>,
    storeData: Partial<Store>,
    storeUserData: Partial<StoreUser>,
    ownerUserData: Partial<User>,
  ) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Create + save business
        const business = manager.create(Business, businessData);
        const newBusiness = await manager.save(Business, business);

        // 2. Create + save store
        const store = manager.create(Store, storeData);
        const newStore = await manager.save(Store, store);

        // 3. Create + save store_user
        const storeUser = manager.create(StoreUser, storeUserData);
        const newStoreUser = await manager.save(StoreUser, storeUser);

        // 4. Create + save user
        const ownerUser = manager.create(User, ownerUserData);
        const newOwnerUser = await manager.save(User, ownerUser);

        return { newBusiness, newStore, newStoreUser, newOwnerUser };
      });
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process request. Please try again.',
          errorCode: 'TRANSACTION_FAILED',
          details:
            this.config.get<string>('NODE_ENV') === 'development'
              ? error.message
              : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
