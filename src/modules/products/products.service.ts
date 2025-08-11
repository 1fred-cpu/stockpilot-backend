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
import { v4 as uuidv4 } from 'uuid';
import { Filter } from 'types/filter';
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
      // 1. Validate store ID
      if (!isValidUUID(createProductDto.storeId)) {
        throw new BadRequestException('Invalid store ID provided');
      }

      // 2. Check if product already exists by name in the same store
      const { data: existingProduct, error: existsError } = await this.supabase
        .from('products')
        .select('id')
        .match({
          name: createProductDto.name,
          store_id: createProductDto.storeId,
        })
        .maybeSingle();

      if (existsError) {
        throw new BadRequestException(
          `Error checking product: ${existsError.message}`,
        );
      }
      if (existingProduct) {
        throw new ConflictException('Product already exists');
      }

      // 3. Create product
      const newProduct = {
        name: createProductDto.name,
        brand: createProductDto.brand,
        category: createProductDto.category,
        description: createProductDto.description,
        store_id: createProductDto.storeId,
        thumbnail: createProductDto.thumbnail,
        tags: createProductDto.tags || [],
        attributes: createProductDto.attributes || null,
        slug: generateSlug(createProductDto.name),
      };

      const { data: productData, error: productError } = await this.supabase
        .from('products')
        .insert([newProduct])
        .select();

      if (productError) {
        throw new BadRequestException(
          `Error creating product: ${productError.message}`,
        );
      }

      const product = productData[0];

      // 4. Create variants + inventory
      const variantsToInsert = createProductDto.variants.map((variant) => ({
        product_id: product.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        weight: variant.weight,
        image_url: variant.image_url,
        dimensions: variant.dimensions,
      }));

      const { data: variantsData, error: variantsError } = await this.supabase
        .from('variants')
        .insert(variantsToInsert)
        .select();

      if (variantsError) {
        throw new BadRequestException(
          `Error creating variants: ${variantsError.message}`,
        );
      }

      // 5. Create inventory for each variant
      const inventoryToInsert = variantsData.map((variant, index) => ({
        product_id: product.id,
        variant_id: variant.id,
        stock: createProductDto.variants[index].stock,
        low_stock_threshold:
          createProductDto.variants[index].low_stock_threshold,
      }));

      const { data: inventoryData, error: inventoryError } = await this.supabase
        .from('inventories')
        .insert(inventoryToInsert)
        .select();

      if (inventoryError) {
        throw new BadRequestException(
          `Error creating inventory: ${inventoryError.message}`,
        );
      }

      return {
        product,
        variants: variantsData,
        inventories: inventoryData,
      };
    } catch (error) {
      this.logger.error('Error creating product:', error);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Unexpected error creating product',
      );
    }
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to find a product
  // Returns: A found product or throws an error if the product does not exist
  async findProduct(productId: string) {
    try {
      // Validate product id if is valid
      const isProductIdValid = isValidUUID(productId);

      // Throws an error if product id is not valid
      if (!isProductIdValid) {
        throw new BadRequestException('Invalid product ID');
      }
      // Find product with id
      const { data: product, error: fetchError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      // If an error occurs  throw an error
      if (fetchError) {
        throw new BadRequestException(
          `An error occured while retrieving product: ${fetchError.message}`,
        );
      }

      if (!product) {
        throw new ConflictException('Product does not exist');
      }

      // Finds all variants for this product
      const { data: variants, error: variantsError } = await this.supabase
        .from('variants')
        .select('*')
        .eq('product_id', productId);

      // If an error occurs  throw an error
      if (variantsError) {
        throw new BadRequestException(
          `An error occured while retrieving product variants: ${variantsError.message}`,
        );
      }

      if (variants.length === 0) {
        throw new NotFoundException('No variants found for this product');
      }
      const data = {
        ...product,
        variants,
      };

      return data; // Return the found product and it variants
    } catch (error) {
      if (
        error instanceof ConflictException ||
        BadRequestException ||
        NotFoundException
      ) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error retrieving product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while retrieving the product',
      );
    }
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to get all products
  // Returns: A found products for a store or throws an error if the product does not exist
  async getProducts(
    storeId: string,
    filter?: Filter,
    limit = 10,
    sort: 'asc' | 'desc' = 'desc',
    category?: string,
  ) {
    try {
      // Validate store id if is valid
      const isStoreIdValid = isValidUUID(storeId);

      // Throws an error if store id is not valid
      if (!isStoreIdValid) {
        throw new BadRequestException('Invalid store ID');
      }

      let supabaseQuery = this.supabase
        .from('products')
        .select('*')
        .match({ store_id: storeId });

      // Apply filter before fetching
      if (filter) {
        switch (filter) {
          case 'bestseller':
            supabaseQuery = supabaseQuery.eq('is_bestseller', true);
            break;
          case 'featured':
            supabaseQuery = supabaseQuery.eq('is_featured', true);
            break;
          case 'new':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            supabaseQuery = supabaseQuery.gte(
              'created_at',
              thirtyDaysAgo.toISOString(),
            );
            break;
          case 'trending':
            supabaseQuery = supabaseQuery.eq('is_trending', true);
            break;
          case 'category':
            supabaseQuery = supabaseQuery.eq('category', filter);
            break;
          default:
            throw new BadRequestException('Invalid filter type');
        }
      }

      if (!filter && category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }
      // Sorting and limiting
      supabaseQuery = supabaseQuery
        .order('created_at', { ascending: sort === 'asc' })
        .limit(limit);

      const { data: products, error: fetchError } = await supabaseQuery;

      if (fetchError) {
        throw new BadRequestException(
          `An error occurred while fetching products: ${fetchError.message}`,
        );
      }

      if (!products || products.length === 0) {
        throw new NotFoundException('No products found');
      }
      for (const product of products) {
        const { data: variants, error: fetchError } = await this.supabase
          .from('variants')
          .select('*')
          .eq('product_id', product.id);

        if (fetchError) {
          throw new BadRequestException(
            `An error occurred while fetching variants: ${fetchError.message}`,
          );
        }
        if (variants.length) product.variants = variants;
      }
      return products;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error retrieving products: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while retrieving the products',
      );
    }
  }

  // Method -- Patch
  // Access -- Private
  // Function:  A function to update a product
  // Returns: The updated product or throws an error if the product does not exist
  async updateProduct(productId: string, updateProductDto: UpdateProductDto) {
    try {
      // Validate product ID if is valid
      const isProductIdValid = isValidUUID(productId);

      if (!isProductIdValid) {
        throw new BadRequestException('Invalid product ID');
      }
      // Find product with product id
      const { data: product, error: fetchError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `An error occured while retrieving product: ${fetchError.message}`,
        );
      }

      if (!product) {
        throw new NotFoundException('Product does not exist');
      }

      // update slug if name want to be changed
      const updatedSlug = updateProductDto.name
        ? generateSlug(updateProductDto.name)
        : product.slug;

      // Find product and update with id
      const { data: updatedProduct, error: updateError } = await this.supabase
        .from('products')
        .update({
          ...updateProductDto,
          slug: updatedSlug,
          updated_at: new Date(),
        })
        .eq('id', productId)
        .select();

      // If an error occurs  throw an error
      if (updateError) {
        throw new Error('An error occured while updating product');
      }

      return updatedProduct[0]; // Return the found product
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error updating product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the product',
      );
    }
  }

  // Method -- Delete
  // Access -- Private
  // Function:  A function to delete a product
  // Returns: The deleted product or throws an error if the product does not exist
  async deleteProduct(productId: string) {
    try {
      // Validate product id if is valid
      const isProductIdValid = isValidUUID(productId);

      if (!isProductIdValid) {
        throw new BadRequestException('Invalid product ID');
      }
      // Find and delete product with product id
      const { data: product, error: deleteError } = await this.supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select();

      if (deleteError) {
        throw new BadRequestException(
          `An error occured while deleting product: ${deleteError.message}`,
        );
      }

      if (!product) {
        throw new NotFoundException('Product does not exist');
      }

      // const { data: duplicates } = await this.supabase
      //   .from('variants')
      //   .select('*')
      //   .eq('product_id', productId);

      // for (const duplicate of duplicates) {
      //   await this.supabase
      //     .from('variants')
      //     .delete()
      //     .match({ product_id: duplicate.id }); // careful: deletes ALL with that id
      // }

      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error deleting product: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while deleting the product',
      );
    }
  }

  // Method -- Patch
  // Access -- Private
  // Function:  A function to update a product variant
  // Returns: The updated product variant or throws an error if the product variant does not exist
  async updateProductVariant(
    productId: string,
    variantId: string,
    updateVariantDto: any,
  ) {
    try {
      const isProductIdValid = isValidUUID(productId);
      const isVariantIdValid = isValidUUID(variantId);

      if (!isProductIdValid || !isVariantIdValid) {
        throw new BadRequestException('Invalid product or variant ID');
      }

      // Check if product exist
      const { data: productExists, error: checkError } = await this.supabase
        .from('products')
        .select('*')
        .match({ id: productId })
        .maybeSingle();

      if (checkError) {
        throw new BadRequestException(
          `An error occured while retrieving product ${checkError.message}`,
        );
      }

      if (!productExists) {
        throw new NotFoundException('Product does not exist');
      }

      // Find and update product variant
      const { data: updatedProductVariant, error: updateError } =
        await this.supabase
          .from('variants')
          .update({ ...updateVariantDto, updated_at: new Date() })
          .match({ product_id: productId, id: variantId })
          .select();

      if (updateError) {
        throw new Error('An error occured while updating product variant');
      }

      if (updatedProductVariant.length === 0) {
        throw new NotFoundException('Product variant does not exist');
      }

      return updatedProductVariant[0]; // Return the updated product variant
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error updating product variant: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the product variant',
      );
    }
  }

  // Method -- Delete
  // Access -- Private
  // Function:  A function to delete a product variant
  // Returns: The deleted product variant or throws an error if the product variant does not exist
  async deleteProductVariant(productId: string, variantId: string) {
    try {
      const isProductIdValid = isValidUUID(productId);
      const isVariantIdValid = isValidUUID(variantId);

      if (!isProductIdValid || !isVariantIdValid) {
        throw new BadRequestException('Invalid product or variant ID');
      }

      // Check if product exist
      const { data: productExists, error: checkError } = await this.supabase
        .from('products')
        .select('*')
        .match({ id: productId })
        .maybeSingle();

      if (checkError) {
        throw new BadRequestException(
          'An error occured while retrieving product',
        );
      }

      if (!productExists) {
        throw new NotFoundException('Product does not exist');
      }

      // Find and delete product variant
      const { data: deletedProductVariant, error: deleteError } =
        await this.supabase
          .from('variants')
          .delete()
          .match({ product_id: productId, id: variantId })
          .select();

      if (deleteError) {
        throw new Error(
          `An error occured while deleting product ${deleteError.message}`,
        );
      }

      if (deletedProductVariant.length === 0) {
        throw new NotFoundException('Product variant does not exist');
      }

      return deletedProductVariant[0]; // Return the deleted product variant
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error deleting product variant: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while deleting the product variant',
      );
    }
  }

  // Method -- Delete
  // Access -- Private
  // Function:  A function to delete a product variant
  // Returns: The deleted variant product or throws an error
  async addProductVariant(productId: string, variant: Variant) {
    try {
      // Validates if product id is valid
      const isProductIdValid = isValidUUID(productId);

      // Throws an error if not
      if (!isProductIdValid) {
        throw new BadRequestException('Invalid product ID');
      }

      // Check if product exist
      const { data: productExists, error: checkError } = await this.supabase
        .from('products')
        .select('*')
        .match({ id: productId })
        .maybeSingle();

      if (checkError) {
        throw new Error(
          `An error occured while retrieving product ${checkError.message}`,
        );
      }

      if (!productExists) {
        throw new NotFoundException('Product does not exist');
      }

      // Check if a product variant exist
      const { data: productVariantExists, error: fetchError } =
        await this.supabase
          .from('variants')
          .select('*')
          .match({ sku: variant.sku })
          .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `An error occured while retrieving product variant ${fetchError.message}`,
        );
      }

      if (productVariantExists) {
        throw new ConflictException('Product variant already exists');
      }

      // Create variant

      const newVariant = {
        product_id: variant.product_id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        weight: variant.weight,
        image_url: variant.image_url,
        dimensions: variant.dimensions,
      };
      const { data: productVariant, error: createError } = await this.supabase
        .from('variants')
        .insert([newVariant])
        .select();

      if (createError) {
        throw new BadRequestException(
          `An error occured while creating product variant ${createError.message}`,
        );
      }

      // Create a inventory for the variant
      const { data: variantInventory, error } = await this.supabase
        .from('inventories')
        .insert([
          {
            product_id: productId,
            variant_id: productVariant[0].id,
            stock: variant.stock,
            reserved: variant.reserved ?? 0,
            low_stock_threshold: variant.low_stock_threshold,
          },
        ])
        .select();

      if (error) {
        throw new BadRequestException(error.message);
      }

      // update the inventory id for the variant
      const { data: updatedVariant, error: updateError } = await this.supabase
        .from('variants')
        .update({ inventory_id: variantInventory[0].id })
        .eq('id', productVariant[0].id)
        .select();

      if (updateError) {
        throw new BadRequestException(updateError.message);
      }

      return {
        variant: updatedVariant[0],
        inventory: variantInventory[0],
      }; // Return the created variant
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof ConflictException) {
        throw error;
      }
      // Logs error to the  console
      this.logger.error('Error creating product variant: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the product variant',
      );
    }
  }

  // Method -- Get
  // Access -- Private
  // Function:  A function to get all product variants
  // Returns: The  variants of a  product or throws an error
  async getProductVariants(productId: string) {
    try {
      // Validates if product id is valid
      const isProductIdValid = isValidUUID(productId);

      // Throws an error if not
      if (!isProductIdValid) {
        throw new BadRequestException('Invalid product ID');
      }

      // Check if product exist
      const { data: productExists, error: checkError } = await this.supabase
        .from('products')
        .select('*')
        .match({ id: productId })
        .maybeSingle();

      if (checkError) {
        throw new Error('An error occured while retrieving product');
      }

      if (!productExists) {
        throw new NotFoundException('Product does not exist');
      }

      // Find product variants
      const { data: productVariants, error: fetchError } = await this.supabase
        .from('variants')
        .select('*')
        .match({ product_id: productId })
        .select();

      if (fetchError) {
        throw new Error(
          fetchError.message ??
            'An error occured while retrieving product variant',
        );
      }

      if (productVariants.length === 0) {
        throw new NotFoundException('Product variants does not exist');
      }

      return productVariants;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      // Logs error to the  console
      this.logger.error('Error retrieving product variants: ', error.message);
      throw new InternalServerErrorException(
        'An unexpected error occurred while retrieving the product variants',
      );
    }
  }
}
