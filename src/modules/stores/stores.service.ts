import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any, // Inject Supabase client
  ) {}

  // Method -- Post
  // Access -- Public
  // Function:  A function to create a new store
  // Returns: A success message or throws an error if the store already exists
  async createStore(createStoreDto: CreateStoreDto) {
    try {
      // Check if the store already exists for the owner
      const { data, error } = await this.supabase
        .from('Stores')
        .select('*')
        .eq('owner_id', createStoreDto.owner_id)
        .maybeSingle();

      // If an error occurs or data is found, throw an error
      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        throw new ConflictException('Store already exists');
      }

      // Create the new store
      const { error: createError } = await this.supabase
        .from('Stores')
        .insert([{ ...createStoreDto }]);

      if (createError) {
        throw new Error(createError.message);
      }

      return { message: 'Store created successfully' };
    } catch (error) {
      this.logger.error('Error creating store', error.message);
      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      } else if (error instanceof ConflictException) {
        throw error; // Re-throw ConflictException
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the store',
      );
    }
  }

  findAll() {
    return `This action returns all stores`;
  }

  findOne(id: number) {
    return `This action returns a #${id} store`;
  }

  update(id: number, updateStoreDto: UpdateStoreDto) {
    return `This action updates a #${id} store`;
  }

  remove(id: number) {
    return `This action removes a #${id} store`;
  }
}
