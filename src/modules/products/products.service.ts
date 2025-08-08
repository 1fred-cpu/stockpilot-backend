import {
  Injectable,
  Inject,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto, Variant } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { isValidUUID } from '../../../utils/id-validator';
import { generateSlug } from 'utils/slug-generator';

@Injectable()
export class ProductsService {
  private logger = new Logger(ProductsService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any, // Inject Supabase client
  ) {}

  // Method -- Post
  // Access -- Private
  // Function:  A function to create a new product
  // Returns: A created product or throws an error if the product already exists
  async createProduct(createProductDto: CreateProductDto) {
    try {
      // Check if the product already exists in products
      const { data, error } = await this.supabase
        .from('Products')
        .select('*')
        .match({
          name: createProductDto.name,
          store_id: createProductDto.store_id,
          slug: createProductDto.slug,
        })
        .maybeSingle();

      // If an error occurs or data is found, throw an error
      if (error) {
        throw new Error('An error occured while checking product existence');
      }

      if (data) {
        throw new ConflictException('Product already exists');
      }

      // Generate slug for the product
      createProductDto.slug = generateSlug(createProductDto.name);

      // Create  new product
      const { data: createdProduct, error: createError } = await this.supabase
        .from('Products')
        .insert([createProductDto])
        .select();

      if (createError) {
        throw new Error('An error occured while creating product');
      }

      return createdProduct[0]; // Return the created product
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      } else if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      // Logs error to the  console
      this.logger.error('Error creating product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the product',
      );
    }
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to find a product
  // Returns: A found product or throws an error if the product does not exist
  async findProduct(id: string) {
    try {
      const isIdValid = isValidUUID(id);

      if (!isIdValid) {
        throw new BadRequestException('Invalid product ID');
      }
      // Find product with id
      const { data, error } = await this.supabase
        .from('Products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // If an error occurs  throw an error
      if (error) {
        throw new Error('An error occured while retrieving product');
      }

      if (!data) {
        throw new ConflictException('Product does not exist');
      }

      return data; // Return the found product
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      // Logs error to the  console
      this.logger.error('Error retrieving product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while retrieving the product',
      );
    }
  }

  // Method -- Patch
  // Access -- Private
  // Function:  A function to update a product
  // Returns: The updated product or throws an error if the product does not exist
  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    try {
      const isIdValid = isValidUUID(id);

      if (!isIdValid) {
        throw new BadRequestException('Invalid product ID');
      }
      // Find product and update with id
      const { data: product, error: fetchError } = await this.supabase
        .from('Products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw new Error('An error occured while retrieving product');
      }

      if (!product) {
        throw new NotFoundException('Product does not exist');
      }
      const updatedVariants = updateProductDto.variants
        ? (() => {
            const variantsMap = new Map<string, Variant>(
              product.variants.map((v) => [v.id, v]), // existing variants
            );

            // merge/update incoming variants
            updateProductDto.variants.forEach((newVar) => {
              variantsMap.set(newVar.id, {
                ...variantsMap.get(newVar.id),
                ...newVar,
              });
            });

            return Array.from(variantsMap.values());
          })()
        : product.variants;

      const updatedSlug = updateProductDto.name
        ? generateSlug(updateProductDto.name)
        : product.slug;

      // Find product and update with id
      const { data: updatedProduct, error: updateError } = await this.supabase
        .from('Products')
        .update({
          ...updateProductDto,
          slug: updatedSlug,
          variants: updatedVariants,
          updated_at: new Date(),
        })
        .eq('id', id)
        .select();

      // If an error occurs  throw an error
      if (updateError) {
        throw new Error('An error occured while retrieving product');
      }

      return updatedProduct; // Return the found product
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      // Logs error to the  console
      this.logger.error('Error updating product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the product',
      );
    }
  }

  findAll() {
    return `This action returns all products`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
