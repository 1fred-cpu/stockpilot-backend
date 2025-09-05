import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { v4 as uuidv4 } from 'uuid';
import { CreateStoreDto } from './dto/create-store.dto';
import { Store } from './entities/store.entity';
import { KafkaHelper } from '../../helpers/kafka.heper';
import { SupabaseClient } from '@supabase/supabase-js';
// @Injectable()
// export class StoresService {
//   private readonly logger = new Logger(StoresService.name);

//   constructor(
//     @Inject('SUPABASE_CLIENT') private readonly supabase: any,
//     private readonly fileUploadService: FileUploadService,
//   ) {}

//   /** -------------------- CREATE STORE -------------------- **/

//   /** -------------------- FIND STORE -------------------- **/
//   async findStore(storeId: string) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data: store, error: fetchError } = await this.supabase
//         .from('stores')
//         .select('*')
//         .eq('id', storeId)
//         .maybeSingle();

//       if (fetchError) {
//         this.logger.error(`Error fetching store: ${fetchError.message}`);
//         throw new InternalServerErrorException('Error fetching store');
//       }

//       if (!store) {
//         throw new NotFoundException('Store not found');
//       }

//       return store;
//     } catch (error) {
//       this.handleServiceError(error, 'findStore');
//     }
//   }
//   /** -------------------- FIND STORE WITH OWNER ID -------------------- **/
//   async findStoreWithOwnerId(ownerId: string) {
//     try {
//       if (!ownerId) {
//         throw new BadRequestException('owner ID is required');
//       }
//       const { data: store, error: fetchError } = await this.supabase
//         .from('stores')
//         .select('*')
//         .eq('ownerId', ownerId)
//         .maybeSingle();

//       if (fetchError) {
//         this.logger.error(`Error fetching store: ${fetchError.message}`);
//         throw new InternalServerErrorException('Error fetching store');
//       }

//       if (!store) {
//         throw new NotFoundException('Store not found');
//       }

//       return store;
//     } catch (error) {
//       this.handleServiceError(error, 'findStore');
//     }
//   }

//   /** -------------------- UPDATE STORE -------------------- **/
//   async updateStore(storeId: string, updateStoreDto: UpdateStoreDto) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data, error: updateError } = await this.supabase
//         .from('stores')
//         .update({
//           ...updateStoreDto,
//           updatedAt: new Date().toISOString(),
//         })
//         .eq('id', storeId)
//         .select();

//       if (updateError) {
//         this.logger.error(`Error updating store: ${updateError.message}`);
//         throw new InternalServerErrorException('Error updating store');
//       }

//       const updatedStore = data[0];
//       if (!updatedStore) {
//         throw new NotFoundException('Store not found');
//       }

//       return {
//         message: 'Store updated successfully',
//         store: updatedStore,
//       };
//     } catch (error) {
//       this.handleServiceError(error, 'updateStore');
//     }
//   }

//   /** -------------------- DELETE STORE -------------------- **/
//   async deleteStore(storeId: string) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data, error: deleteError } = await this.supabase
//         .from('stores')
//         .delete()
//         .eq('id', storeId)
//         .select();

//       if (deleteError) {
//         this.logger.error(`Error deleting store: ${deleteError.message}`);
//         throw new InternalServerErrorException('Error deleting store');
//       }

//       const deletedStore = data[0];
//       if (!deletedStore) {
//         throw new NotFoundException('Store not found');
//       }

//       return { message: 'Store deleted successfully' };
//     } catch (error) {
//       this.handleServiceError(error, 'deleteStore');
//     }
//   }
//   async findAllStores(query: {
//     limit?: number;
//     page?: number;
//     ownerId?: string;
//     businessType?: string;
//   }) {
//     try {
//       const { limit = 10, page = 1, ownerId, businessType } = query;

//       let supabaseQuery = this.supabase
//         .from('stores')
//         .select('*', { count: 'exact' });

//       // Apply filters if provided
//       if (ownerId) {
//         supabaseQuery = supabaseQuery.eq('ownerId', ownerId);
//       }

//       if (businessType) {
//         supabaseQuery = supabaseQuery.ilike(
//           'businessType',
//           `%${businessType}%`,
//         );
//       }

//       // Apply pagination
//       const from = (page - 1) * limit;
//       const to = from + limit - 1;
//       supabaseQuery = supabaseQuery.range(from, to);

//       const { data, error, count } = await supabaseQuery;

//       if (error) {
//         throw new BadRequestException(
//           `Error fetching stores: ${error.message}`,
//         );
//       }

//       return {
//         stores: data,
//         pagination: {
//           total: count,
//           page,
//           limit,
//           totalPages: Math.ceil(count / limit),
//         },
//       };
//     } catch (error) {
//       if (error instanceof BadRequestException) throw error;
//       throw new InternalServerErrorException(
//         'An error occurred while fetching stores',
//       );
//     }
//   }

//   async getStoreProductsCategories(storeId: string) {
//     try {
//       if (!isValidUUID(storeId)) {
//         throw new BadRequestException('Invalid store ID format');
//       }

//       const { data, error } = await this.supabase
//         .from('categories')
//         .select('name')
//         .eq('storeId', storeId);

//       if (error) {
//         this.logger.error(
//           `Error fetching product categories: ${error.message}`,
//         );
//         throw new InternalServerErrorException(
//           'Error fetching product categories',
//         );
//       }

//       if (!data || data.length === 0) {
//         return [];
//       }

//       return data.map((category) => category.name);
//     } catch (error) {
//       this.handleServiceError(error, 'getStoreProductsCategories');
//     }
//   }
//   /** -------------------- HELPER METHODS -------------------- **/
//   private validateUUID(id: string, label: string) {
//     if (!isValidUUID(id)) {
//       throw new BadRequestException(`Invalid format for ${label}`);
//     }
//   }

//   private handleServiceError(error: any, method: string) {
//     if (
//       error instanceof BadRequestException ||
//       error instanceof NotFoundException ||
//       error instanceof ConflictException
//     ) {
//       throw error;
//     }
//     this.logger.error(`Unexpected error in ${method}: ${error.message}`);
//     throw new InternalServerErrorException('An unexpected error occurred');
//   }

//   private async createStore(data: CreateStoreDto): Promise<any> {
//     const { data: store, error: createError } = await this.supabase
//       .from('stores')
//       .insert([data])
//       .select()
//       .maybeSingle();

//     if (createError) {
//       throw new InternalServerErrorException('Error creating store');
//     }

//     return store;
//   }
// }

// store.service.ts

@Injectable()
export class StoresService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly kafkaHelper: KafkaHelper,
    private readonly errorHandler: HandleErrorService,
  ) {}

  /* CREATE STORE METHOD */
  async createStore(dto: CreateStoreDto): Promise<Store | undefined> {
    try {
      // Check if store with same name and business_id exists for the business
      if (await this.doStoreExists(dto.business_id, dto.name)) {
        throw new ConflictException(
          'Store with this business ID and name already exists',
        );
      }

      // Define a store data
      const store = {
        id: uuidv4(),
        business_id: dto.business_id,
        name: dto.name,
        timezone: dto.timezone,
        currency: dto.currency,
        created_at: new Date().toISOString(),
      };

      // Insert into Supabase
      const { error: createError } = await this.supabase
        .from('stores')
        .insert([store]);

      if (createError) {
        throw new BadRequestException(createError.message);
      }

      // Emit Kafka event
      await this.kafkaHelper.emitEvent(
        'store.events',
        store.business_id,
        'StoreCreated',
        store,
      );

      return store;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'create method');
    }
  }
  /** Helpers method */

  private async doStoreExists(
    business_id: string,
    name: string,
  ): Promise<boolean> {
    const { data: existsStore, error: existsError } = await this.supabase
      .from('stores')
      .select('id')
      .match({ business_id, name })
      .maybeSingle();

    if (existsError) {
      throw new BadRequestException('Error checking store existence');
    }

    return existsStore !== null;
  }
}
