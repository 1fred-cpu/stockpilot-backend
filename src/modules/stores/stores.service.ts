import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { isValidUUID } from '../../../utils/id-validator';
import { Multer } from 'multer';
@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}

  /** -------------------- CREATE STORE -------------------- **/
  async createStore(createStoreDto: CreateStoreDto, file: Multer.File) {
    try {
      // Check if store already exists for the owner
      const { data: existingStore, error: existsError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('ownerId', createStoreDto.formData.ownerId)
        .maybeSingle();

      if (existsError) {
        this.logger.error(
          `Error checking store existence: ${existsError.message}`,
        );
        throw new BadRequestException(
          existsError.message || 'Could not verify store existence',
        );
      }

      if (existingStore) {
        throw new ConflictException('Store already exists for this owner');
      }

      const logoUrl = await this.uploadFile(
        file,
        createStoreDto.formData.storeName,
      );

      // Insert new store
      const { data: newStore, error: createError } = await this.supabase
        .from('stores')
        .upsert({ ...createStoreDto.formData, logoUrl })
        .select()
        .maybeSingle();

      if (createError) {
        this.logger.error(`Error creating store: ${createError.message}`);
        throw new BadRequestException(
          createError.message || 'Error creating store',
        );
      }

      return { message: 'Store created successfully', store: newStore };
    } catch (error) {
      this.handleServiceError(error, 'createStore');
    }
  }

  /** -------------------- FIND STORE -------------------- **/
  async findStore(storeId: string) {
    try {
      this.validateUUID(storeId, 'store ID');

      const { data: store, error: fetchError } = await this.supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchError) {
        this.logger.error(`Error fetching store: ${fetchError.message}`);
        throw new InternalServerErrorException('Error fetching store');
      }

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      return store;
    } catch (error) {
      this.handleServiceError(error, 'findStore');
    }
  }

  /** -------------------- UPDATE STORE -------------------- **/
  async updateStore(storeId: string, updateStoreDto: UpdateStoreDto) {
    try {
      this.validateUUID(storeId, 'store ID');

      const { data, error: updateError } = await this.supabase
        .from('stores')
        .update({
          ...updateStoreDto,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', storeId)
        .select();

      if (updateError) {
        this.logger.error(`Error updating store: ${updateError.message}`);
        throw new InternalServerErrorException('Error updating store');
      }

      const updatedStore = data[0];
      if (!updatedStore) {
        throw new NotFoundException('Store not found');
      }

      return {
        message: 'Store updated successfully',
        store: updatedStore,
      };
    } catch (error) {
      this.handleServiceError(error, 'updateStore');
    }
  }

  /** -------------------- DELETE STORE -------------------- **/
  async deleteStore(storeId: string) {
    try {
      this.validateUUID(storeId, 'store ID');

      const { data, error: deleteError } = await this.supabase
        .from('stores')
        .delete()
        .eq('id', storeId)
        .select();

      if (deleteError) {
        this.logger.error(`Error deleting store: ${deleteError.message}`);
        throw new InternalServerErrorException('Error deleting store');
      }

      const deletedStore = data[0];
      if (!deletedStore) {
        throw new NotFoundException('Store not found');
      }

      return { message: 'Store deleted successfully' };
    } catch (error) {
      this.handleServiceError(error, 'deleteStore');
    }
  }
  async findAllStores(query: {
    limit?: number;
    page?: number;
    ownerId?: string;
    businessType?: string;
  }) {
    try {
      const { limit = 10, page = 1, ownerId, businessType } = query;

      let supabaseQuery = this.supabase
        .from('stores')
        .select('*', { count: 'exact' });

      // Apply filters if provided
      if (ownerId) {
        supabaseQuery = supabaseQuery.eq('ownerId', ownerId);
      }

      if (businessType) {
        supabaseQuery = supabaseQuery.ilike(
          'businessType',
          `%${businessType}%`,
        );
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new BadRequestException(
          `Error fetching stores: ${error.message}`,
        );
      }

      return {
        stores: data,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'An error occurred while fetching stores',
      );
    }
  }
  /** -------------------- HELPER METHODS -------------------- **/
  private validateUUID(id: string, label: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(`Invalid format for ${label}`);
    }
  }

  private handleServiceError(error: any, method: string) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }
    this.logger.error(`Unexpected error in ${method}: ${error.message}`);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  async uploadFile(file: Multer.File | null, storeName: string) {
    if (!file || !storeName) return null;
    const path = `stores/${storeName}/${Date.now()}_${file.originalname}`;

    const { data, error } = await this.supabase.storage
      .from('logos') // bucket name
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    if (error) {
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }

    // If bucket is PUBLIC:
    const { data: pub } = this.supabase.storage
      .from('logos')
      .getPublicUrl(path);
    return pub.publicUrl;
  }
}
('');
