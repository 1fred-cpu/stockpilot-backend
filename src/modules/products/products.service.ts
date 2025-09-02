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
import { Filter } from 'types/filter';
import { Multer } from 'multer';
import { FileUploadService } from '../../../utils/upload-file';
import { DiscountsService } from '../discounts/discounts.service';
import { getPathFromUrl } from 'utils/get-path';

@Injectable()
export class ProductsService {
  private logger = new Logger(ProductsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly fileUploadService: FileUploadService,
    private readonly discountsService: DiscountsService,
  ) {}

  /** Helper: Validate UUID */
  private validateUUID(id: string, fieldName: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(`Invalid ${fieldName} provided`);
    }
  }

  /** Helper: Fetch product by ID */
  private async getProductById(productId: string) {
    const { data: product, error } = await this.supabase
      .from('products')
      .select('*, stores(storeName), categories(name)')
      .eq('id', productId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Error retrieving product: ${error.message}`,
      );
    }
    if (!product) {
      throw new NotFoundException('Product does not exist');
    }
    return product;
  }

  /** Create product with variants + inventory */
  async createProduct(createProductDto: any) {
    try {
      const {
        storeId,
        name,
        brand,
        category,
        description,
        tags,
        attributes,
        variants,
        thumbnail,
        storeName,
      } = createProductDto;

      this.validateUUID(storeId, 'store ID');

      // Generate slug for product
      const slug = generateSlug(name);
      // Check duplicate product name in store
      const { data: existingProduct, error: existsError } = await this.supabase
        .from('products')
        .select('id')
        .match({ slug, storeId })
        .maybeSingle();

      if (existsError) {
        throw new BadRequestException(
          `Error checking product: ${existsError.message}`,
        );
      }
      if (existingProduct) {
        throw new ConflictException('Product already exists');
      }

      // Upload thumbnail file and get url

      const path = `stores/${storeName}/${new Date().getTime()}_${
        thumbnail.originalname
      }`;
      const bucket = 'products';
      const thumbnailUrl = await this.fileUploadService.uploadFile(
        thumbnail,
        path,
        bucket,
      );

      if (!thumbnailUrl) {
        throw new BadRequestException('Thumbnail file is required');
      }

      // find category
      const { data: categoryData, error: categoryError } = await this.supabase
        .from('categories')
        .select('id')
        .match({ storeId, name: category })
        .maybeSingle();
      if (categoryError) {
        throw new BadRequestException(
          'Supabase Error fetching category: ' + categoryError.message,
        );
      }
      let categoryId = categoryData?.id || null;

      // Create category if not created
      if (!categoryData) {
        const { data, error } = await this.supabase
          .from('categories')
          .upsert({ name: category, storeId })
          .select()
          .maybeSingle();
        if (error) {
          throw new BadRequestException(
            'Supabase Error creating category: ' + error.message,
          );
        }
        categoryId = data.id;
      }
      // Create product
      const newProductData = {
        name,
        brand,
        categoryId,
        description,
        storeId,
        thumbnail: thumbnailUrl,
        tags: tags || [],
        attributes: attributes || {},
        slug,
      };

      const { data: productData, error: productError } = await this.supabase
        .from('products')
        .insert([newProductData])
        .select();

      if (productError) {
        throw new BadRequestException(
          `Error creating product: ${productError.message}`,
        );
      }

      const product = productData[0];

      // Create variants
      const variantsToInsert = variants.map(async (variant) => {
        // Define a path to upload file
        const path = `stores/${storeName}/${new Date().getTime()}_${
          variant.imageFile.originalname
        }`;
        // Bucket name to store files
        const bucket = 'products';
        // Upload file and return url
        const imageUrl = await this.fileUploadService.uploadFile(
          variant.imageFile,
          path,
          bucket,
        );
        // Throw an error if image url is empty
        if (!imageUrl) {
          throw new BadRequestException('Variant image file required');
        }

        return {
          productId: product.id,
          storeId: product.storeId,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          weight: variant.weight,
          imageUrl,
          dimensions: variant.dimensions,
        };
      });

      const { data: variantsData, error: variantsError } = await this.supabase
        .from('variants')
        .insert(await Promise.all(variantsToInsert))
        .select();

      if (variantsError) {
        throw new BadRequestException(
          `Error creating variants: ${variantsError.message}`,
        );
      }

      // Create inventory
      const inventoryToInsert = variantsData.map((variant, index) => ({
        productId: product.id,
        storeId,
        variantId: variant.id,
        stock: variants[index].stock,
        reserved: variants[index].reserved,
        totalStock: variants[index].stock,
        lowStockThreshold: variants[index].lowStockThreshold,
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

      // Update inventoryId in variant
      for (const inv of inventoryData) {
        await this.supabase
          .from('variants')
          .update({ inventoryId: inv.id })
          .eq('id', inv.variantId);
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
      )
        throw error;
      throw new InternalServerErrorException(
        'Unexpected error creating product',
      );
    }
  }

  /** Find product and variants */
  async findProduct(productId: string) {
    try {
      this.validateUUID(productId, 'product ID');
      const product = await this.getProductById(productId);

      const { data: variants, error: variantsError } = await this.supabase
        .from('variants')
        .select('*, inventories(stock,lowStockThreshold,reserved)')
        .eq('productId', productId);

      if (variantsError) {
        throw new BadRequestException(
          `Error retrieving product variants: ${variantsError.message}`,
        );
      }
      if (!variants.length) {
        throw new NotFoundException('No variants found for this product');
      }
      const productWithVariants = { ...product, variants };

      const appliedDiscountProductWithVariants =
        (await this.discountsService.applyDiscounts(product.storeId, [
          productWithVariants,
        ])) || [];

      return { product: appliedDiscountProductWithVariants[0] };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Error retrieving product: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error retrieving product',
      );
    }
  }

  /** Get products with optional filter/category */
  async getProducts(
    storeId: string,
    filter?: Filter,
    limit = 100,
    sort: 'asc' | 'desc' = 'desc',
    category?: string,
  ) {
    try {
      this.validateUUID(storeId, 'store ID');

      let query = this.supabase
        .from('products')
        .select('*,categories(name)')
        .eq('storeId', storeId);

      // Apply filter
      if (filter) {
        switch (filter) {
          case 'bestseller':
            query = query.eq('isBestseller', true);
            break;
          case 'featured':
            query = query.eq('isFeatured', true);
            break;
          case 'new':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.gte('createdAt', thirtyDaysAgo.toISOString());
            break;
          case 'trending':
            query = query.eq('isTrending', true);
            break;
          default:
            throw new BadRequestException('Invalid filter type');
        }
      }

      if (!filter && category) {
        query = query.eq('category', category);
      }

      // Sort + limit
      query = query
        .order('createdAt', { ascending: sort === 'asc' })
        .limit(limit);

      const { data: products, error: fetchError } = await query;
      if (fetchError) {
        throw new BadRequestException(
          `Error fetching products: ${fetchError.message}`,
        );
      }
      if (products.length === 0) {
        return [{ products: [] }];
      }

      // Attach variants
      for (const product of products) {
        const { data: variants, error: variantsError } = await this.supabase
          .from('variants')
          .select('*, inventories(stock, lowStockThreshold)')
          .eq('productId', product.id);

        if (variantsError) {
          throw new BadRequestException(
            `Error fetching variants: ${variantsError.message}`,
          );
        }
        product.variants = variants || [];
      }

      const appliedDiscountsProducts =
        await this.discountsService.applyDiscounts(storeId, products);

      return { products: appliedDiscountsProducts };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error('Error retrieving products: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error retrieving products',
      );
    }
  }

  /** Update product */
  async updateProduct(productId: string, dto: UpdateProductDto) {
    try {
      this.validateUUID(productId, 'product ID');
      const product = (await this.findProduct(productId)).product;

      // 1️⃣ Handle category
      let categoryId = product.categoryId;
      if (dto.category) {
        categoryId = await this.handleCategory(dto);
      }

      // 2️⃣ Handle thumbnail
      if (dto.thumbnail) {
        dto.thumbnail = await this.handleThumbnail(product, dto.thumbnail);
      }

      // 3️⃣ Build update payload (only provided fields)
      const updatePayload: any = { updatedAt: new Date() };
      if (dto.name) {
        updatePayload.name = dto.name;
        updatePayload.slug = generateSlug(dto.name);
      }
      if (dto.brand) updatePayload.brand = dto.brand;
      if (dto.description) updatePayload.description = dto.description;
      if (dto.tags) updatePayload.tags = dto.tags;
      if (dto.attributes) updatePayload.attributes = dto.attributes;
      if (categoryId) updatePayload.categoryId = categoryId;
      if (dto.thumbnail) updatePayload.thumbnail = dto.thumbnail;

      const { error: updateError } = await this.supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId);

      if (updateError) {
        throw new BadRequestException(
          'Supabase error updating product: ' + updateError.message,
        );
      }

      // 4️⃣ Handle variants
      if (dto.variants || dto.variantsToDelete) {
        await this.handleVariants(product, productId, dto);
      }

      // 5️⃣ Return updated product
      return await this.findProduct(productId);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      this.logger.error('Error updating product: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error updating product',
      );
    }
  }

  /** Delete product */
  async deleteProduct(productId: string) {
    try {
      this.validateUUID(productId, 'product ID');

      // Fetch product variants
      const variants = await this.getProductVariants(productId);

      // Delete the product
      const { data: deletedProduct, error: deleteError } = await this.supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select()
        .maybeSingle();

      // Throw error if error deleting product
      if (deleteError) {
        throw new BadRequestException(
          `Supabase Error deleting product: ${deleteError.message}`,
        );
      }

      // Throw error if product not found
      if (!deletedProduct) {
        throw new NotFoundException('Product does not exist');
      }
      const product = deletedProduct;

      // Remove thumbnail of product from bucket
      const path = getPathFromUrl(product.thumbnail);
      await this.fileUploadService.deleteFile(path, 'products');

      // Loop through each variants and delete it image from bucket

      for (const variant of variants) {
        const variantImagePath = getPathFromUrl(variant.imageUrl);
        await this.fileUploadService.deleteFile(path, 'products');
      }

      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error('Error deleting product: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error deleting product',
      );
    }
  }

  /** Update product variant */
  async updateProductVariant(
    productId: string,
    variantId: string,
    updateVariantDto: any,
  ) {
    this.validateUUID(productId, 'product ID');
    this.validateUUID(variantId, 'variant ID');

    //  await this.getProductById(productId);

    // new variant data
    const newVariantData = {
      productId,
      sku: updateVariantDto.sku,
      color: updateVariantDto.color,
      size: updateVariantDto.size,
      price: updateVariantDto.price,
      weight: updateVariantDto.weight,
      imageUrl: updateVariantDto.imageFile || updateVariantDto.imageUrl,
      dimensions: updateVariantDto.dimensions,
    };

    // Update the variant
    const { data: updatedVariant, error: updateError } = await this.supabase
      .from('variants')
      .update({ ...newVariantData, updatedAt: new Date() })
      .match({ productId, id: variantId })
      .select();

    if (updateError) {
      throw new BadRequestException(
        `Supabase Error updating product variant: ${updateError.message}`,
      );
    }
    if (!updatedVariant.length) {
      throw new NotFoundException('Product variant does not exist');
    }

    // Update lowStockThreshold, reserved, for variant inventory if needs to change

    if (updateVariantDto.reserved || updateVariantDto.lowStockThreshold) {
      // Get variant + inventory
      const varinatPlusInventory = await this.getProductVariant(
        productId,
        variantId,
      );

      const {
        data: variantInventoryUpdated,
        error: variantInventoryUpdateError,
      } = await this.supabase
        .from('inventories')
        .update({
          reserved:
            updateVariantDto.reserved ||
            varinatPlusInventory.inventories.reserved,
          lowStockThreshold:
            updateVariantDto.lowStockThreshold ||
            varinatPlusInventory.inventories.lowStockThreshold,
          updatedAt: new Date(),
        })
        .eq('variantId', variantId)
        .select();
      if (variantInventoryUpdateError) {
        console.log(variantInventoryUpdateError);
        throw new BadRequestException(`Supabase Error updating variant inventory:
            ${variantInventoryUpdateError.message}`);
      }
    }
    return updatedVariant[0];
  }

  /** Delete product variant */
  async deleteProductVariant(productId: string, variantId: string) {
    this.validateUUID(variantId, 'variant ID');

    // Delete variant using productId and variantId
    const { data: deletedVariant, error: deleteError } = await this.supabase
      .from('variants')
      .delete()
      .match({ productId, id: variantId })
      .select()
      .maybeSingle();

    // Throw an error if error deleting variant
    if (deleteError) {
      throw new BadRequestException(
        `Supabase Error deleting product variant: ${deleteError.message}`,
      );
    }
    // Throw an error if variant not found
    if (!deletedVariant) {
      throw new NotFoundException('Product variant does not exist');
    }

    // Remove variant image from bucket
    const path = getPathFromUrl(deletedVariant.imageUrl);
    await this.fileUploadService.deleteFile(path, 'products');

    // return deletedVariant
    return deletedVariant;
  }

  /** Add product variant */
  async addProductVariant(productId: string, variant: Variant) {
    try {
      this.validateUUID(productId, 'product ID');
      // const product = await this.getProductById(productId);

      // Check SKU uniqueness
      const { data: existingVariant, error: fetchError } = await this.supabase
        .from('variants')
        .select('*')
        .match({ sku: variant.sku })
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Supabase Error checking product variant: ${fetchError.message}`,
        );
      }
      if (existingVariant) {
        throw new ConflictException(
          `Product variant with ${variant.sku} SKU already exists`,
        );
      }

      // Create variant
      const newVariantData = {
        productId,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        weight: variant.weight,
        imageUrl: variant.imageFile,
        dimensions: variant.dimensions,
      };

      const { data: createdVariant, error: createError } = await this.supabase
        .from('variants')
        .insert([newVariantData])
        .select();

      if (createError) {
        throw new BadRequestException(
          `Supabase Error creating product variant: ${createError.message}`,
        );
      }

      // Create inventory
      const { data: variantInventory, error: inventoryError } =
        await this.supabase
          .from('inventories')
          .insert([
            {
              productId,
              variantId: createdVariant[0].id,
              stock: variant.stock,
              reserved: variant.reserved ?? 0,
              totalStock: variant.stock,
              lowStockThreshold: variant.lowStockThreshold,
            },
          ])
          .select();

      if (inventoryError) {
        throw new BadRequestException(
          `Supabase Error creating inventory: ${inventoryError.message}`,
        );
      }

      // Update the variant inventoryId field
      const { data: updatedVariant, error: updatedVariantError } =
        await this.supabase
          .from('variants')
          .update({ inventoryId: variantInventory[0].id })
          .eq('id', createdVariant[0].id)
          .select();
      if (updatedVariantError) {
        throw new BadRequestException(
          `Supabase Error updating variant: ${updatedVariantError.message}`,
        );
      }

      return {
        variant: updatedVariant[0],
        inventory: variantInventory[0],
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.error('Error adding product variant: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error adding product variant',
      );
    }
  }

  async getProductVariant(productId: string, variantId: string) {
    try {
      this.validateUUID(variantId, 'Variant ID');
      // const product = await this.getProductById(productId);

      // Get product variant with productId and variantId
      const { data: variant, error: fetchError } = await this.supabase
        .from('variants')
        .select('*, inventories(reserved, lowStockThreshold, stock)')
        .match({ productId, id: variantId })
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Supabase Error fetching product variant: ${fetchError.message}`,
        );
      }
      if (!variant) {
        throw new NotFoundException('Product variant does not exists');
      }

      // return variant
      return variant;
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException)
        throw error;
      this.logger.error('Error fetching product variant: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error fetching product variant',
      );
    }
  }

  async getProductVariants(productId: string) {
    try {
      const { data: variants, error: fetchError } = await this.supabase
        .from('variants')
        .select('*')
        .match({ productId });

      if (fetchError) {
        throw new BadRequestException(
          `Supabase Error fetching product variants: ${fetchError.message}`,
        );
      }
      if (variants.length === 0) {
        throw new NotFoundException(
          `No variants found for this product with this ${productId}
                    ID`,
        );
      }

      // return variants
      return variants;
    } catch (error) {
      if (error instanceof BadRequestException || NotFoundException)
        throw error;
      this.logger.error('Error fetching product variants: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error fetching product variants',
      );
    }
  }

  /* Helpers */
  private async handleCategory(dto: UpdateProductDto): Promise<string> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id')
      .eq('name', dto.category)
      .maybeSingle();

    if (error)
      throw new BadRequestException(
        'Supabase error fetching category: ' + error.message,
      );
    if (data) return data.id;

    // Create new category
    const { data: newCategory, error: insertError } = await this.supabase
      .from('categories')
      .insert([{ name: dto.category, storeId: dto.storeId }])
      .select();

    if (insertError)
      throw new BadRequestException(
        'Supabase error creating category: ' + insertError.message,
      );

    return newCategory[0].id;
  }

  private async handleThumbnail(
    product: any,
    newThumbnail: Multer.File,
  ): Promise<string> {
    if (product.thumbnail) {
      const prevPath = getPathFromUrl(product.thumbnail);
      await this.fileUploadService.deleteFile(prevPath, 'products');
    }

    const path = `stores/${product.stores.storeName}/${Date.now()}_${
      newThumbnail.originalname
    }`;
    return await this.fileUploadService.uploadFile(
      newThumbnail,
      path,
      'products',
    );
  }

  private async handleVariants(
    product: any,
    productId: string,
    dto: UpdateProductDto,
  ) {
    console.log(dto.variantsToDelete);
    // 1. Delete variants explicitly requested
    if (dto.variantsToDelete && dto.variantsToDelete.length > 0) {
      for (const variantId of dto.variantsToDelete) {
        await this.deleteProductVariant(productId, variantId);
      }
    }

    // 2. Add/update variants
    if (dto.variants) {
      for (const variant of dto.variants) {
        if (variant.id) {
          await this.updateOrReplaceVariant(product, productId, variant);
        } else {
          await this.createVariant(product, productId, variant);
        }
      }
    }
  }

  private async updateOrReplaceVariant(
    product: any,
    productId: string,
    variant: any,
  ) {
    const existingVariant = product.variants.find((v) => v.id === variant.id);
    if (!existingVariant) return;

    if (variant.imageFile) {
      if (existingVariant.imageUrl) {
        const prevPath = getPathFromUrl(existingVariant.imageUrl);
        await this.fileUploadService.deleteFile(prevPath, 'products');
      }

      const path = `stores/${product.stores.storeName}/${Date.now()}_${
        variant.imageFile.originalname
      }`;
      variant.imageFile = await this.fileUploadService.uploadFile(
        variant.imageFile,
        path,
        'products',
      );
    }

    const { error } = await this.updateProductVariant(
      productId,
      variant.id,
      variant,
    );
    if (error)
      throw new BadRequestException(
        'Supabase error updating variant: ' + error.message,
      );
  }

  private async createVariant(product: any, productId: string, variant: any) {
    if (variant.imageFile) {
      const path = `stores/${product.stores.storeName}/${Date.now()}_${
        variant.imageFile.originalname
      }`;
      variant.imageFile = await this.fileUploadService.uploadFile(
        variant.imageFile,
        path,
        'products',
      );
    }
    await this.addProductVariant(productId, variant);
  }
}
