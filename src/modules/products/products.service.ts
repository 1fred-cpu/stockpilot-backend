import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateSlug } from 'src/utils/slug-generator';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { VariantsService } from './variants.service';
import { getPathFromUrl } from 'src/utils/get-path';
import { FileUploadService } from 'src/utils/upload-file';
import { Multer } from 'multer';
import { DiscountsService } from '../discounts/discounts.service';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { Business } from '../../entities/business.entity';
import { ProductVariant } from '../../entities/product-variants.entity';
import { Product } from '../../entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly errorHandler: HandleErrorService,
    private readonly variantService: VariantsService,
    private readonly fileService: FileUploadService,
    private readonly discountsService: DiscountsService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(StoreInventory)
    private readonly inventoryRepo: Repository<StoreInventory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   *
   * @param name
   * @param businessId
   * @returns a boolean value
   */
  private async doProductExists(
    name: string,
    businessId: string,
  ): Promise<boolean | undefined> {
    try {
      const { data: existingProduct, error: existsError } = await this.supabase
        .from('products')
        .select('id')
        .match({
          business_id: businessId,
          name,
        })
        .maybeSingle();

      if (existsError) {
        throw new BadRequestException(existsError.message);
      }

      if (existingProduct) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'doProductExists');
    }
  }

  /**
   *
   * @param businessId
   * @returns
   */
  async findAllProductsByBusiness(businessId: string) {
    try {
      const data = await this.productRepo.find({
        where: {
          business_id: businessId,
        },
        relations: {
          product_variants: {
            store_inventories: true,
            //                 store_inventory_batches: true
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          // 👇 select only fields you need
          product_variants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            store_inventories: true,
            //                        store_inventory_batches: true
          },
        },
      });
      if (data.length === 0) {
        return [];
      }

      const products = data.map((p) => ({
        id: p.id,
        business_id: p.business_id,
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand,
        //              track_batches: p.track_batches,
        tags: p.tags,
        thumbnail: p.thumbnail,
        created_at: p.created_at,
        updated_at: p.updated_at,
        product_variants: p.product_variants || [],
      }));

      return products;
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findAllByBusiness');
    }
  }
  /**
   *
   * @param productId
   * @returns
   */
  async findProduct(productId: string, storeId: string) {
    try {
      const data = await this.productRepo.findOne({
        where: {
          id: productId,
        },
        relations: {
          product_variants: {
            store_inventories: true,
            //store_inventory_batches: true
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          // 👇 select only fields you need
          product_variants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            store_inventories: true,
            //                        store_inventory_batches: true
          },
        },
      });
      if (!data) throw new NotFoundException('Product not found');

      const product = {
        id: data.id,
        business_id: data.business_id,
        name: data.name,
        description: data.description,
        category: data.category,
        brand: data.brand,
        //track_batches: data.track_batches,
        tags: data.tags,
        thumbnail: data.thumbnail,
        created_at: data.created_at,
        updated_at: data.updated_at,
        product_variants: data.product_variants || [],
      };

      return this.discountsService.applyDiscounts(storeId, [product]);
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findOne');
    }
  }

  /**
   *
   * @param storeId
   * @returns
   */
  async findAllProductsByStore(storeId: string) {
    try {
      const data = await this.productRepo.find({
        where: {
          product_variants: {
            store_id: storeId, // filter inside variants
          },
        },
        relations: {
          product_variants: {
            store_inventories: true,
            //                 store_inventory_batches: true
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          // 👇 select only fields you need
          product_variants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            store_inventories: true,
            //                        store_inventory_batches: true
          },
        },
      });
      if (data.length === 0) {
        return [];
      }

      const products = (data || []).map((p) => ({
        id: p.id,
        business_id: p.business_id,
        name: p.name,
        description: p.description,
        category: p.category_type,
        brand: p.brand,
        tags: p.tags,
        thumbnail: p.thumbnail,
        created_at: p.created_at,
        updated_at: p.updated_at,
        product_variants: p.product_variants || [],
      }));

      return this.discountsService.applyDiscounts(storeId, products);
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findAllByStore');
    }
  }
  /**
   *
   * @param businessId
   * @param dto
   * @returns
   */
  async createProductWithVariants(businessId: string, dto: CreateProductDto) {
    const now = new Date();
    const uploadedImageUrls: string[] = [];

    try {
      // 1. Check business exists
      const business = await this.businessRepo.findOne({
        where: { id: businessId },
      });
      if (!business) {
        throw new NotFoundException(
          'Cannot find a business with this business ID',
        );
      }

      // 2. Check if product already exists
      const existingProduct = await this.productRepo.findOne({
        where: { name: dto.name },
      });
      if (existingProduct) {
        throw new ConflictException(
          'A product already exists with this credentials',
        );
      }
      // 3. Check if variants provided exists
      for (const variant of dto.variants) {
        const existsingVariant = await this.variantRepo.findOne({
          where: { sku: variant.sku },
        });
        if (existsingVariant) {
          throw new ConflictException(`Variant with sku ${variant.sku}
                  already exists`);
        }
      }

      // 4. Prepare product payload
      const categoryId = await this.handleCategory(dto);
      const path = `businesses/${dto.business_name.split(' ')[0]}/${uuidv4()}_${
        dto.thumbnail.originalname
      }`;
      const thumbnailUrl = await this.fileService.uploadFile(
        dto.thumbnail,
        path,
        'products',
      );
      uploadedImageUrls.push(thumbnailUrl);
      const productData = {
        id: uuidv4(),
        business_id: businessId,
        description: dto.description,
        name: dto.name,
        tags: dto.tags || [],
        brand: dto.brand,
        slug: generateSlug(dto.name),
        thumbnail: thumbnailUrl,
        category_id: categoryId,
        category_type: dto.category,
        created_at: now,
        updated_at: now,
      };

      // 5. Upload images + prepare variants
      const variantsData = await Promise.all(
        dto.variants.map(async (variant) => {
          const path = `businesses/${dto.business_name.split(' ')[0]}/${uuidv4()}_${
            variant.image_file.originalname
          }`;
          const imageUrl = await this.fileService.uploadFile(
            variant.image_file,
            path,
            'products',
          );
          uploadedImageUrls.push(imageUrl);

          return {
            id: uuidv4(),
            product_id: productData.id,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            image_url: imageUrl,
            store_id: dto.store_id,
            attributes: variant.attributes || [],
            business_id: businessId,
            created_at: now,
            updated_at: now,
          };
        }),
      );

      // 6. Inventories
      const variantInventories = variantsData.map((variant, index) => ({
        id: uuidv4(),
        business_id: businessId,
        store_id: dto.store_id,
        variant_id: variant.id,
        quantity: dto.variants[index].quantity,
        reserved: dto.variants[index].reserved,
        low_stock_threshold: dto.variants[index].low_stock_threshold,
        created_at: now,
        updated_at: now,
      }));
      console.log(variantsData);

      // 7. Transaction (product + variants + inventories)
      return await this.dataSource.transaction(async (manager) => {
        // Insert product
        const product = manager.create(Product, productData);
        const newProduct = await manager.save(Product, product);

        // Insert variants
        const variantEntities = manager.create(ProductVariant, variantsData);

        const newVariants = await manager.save(ProductVariant, variantEntities);

        // Insert inventories
        const inventoryEntities = manager.create(
          StoreInventory,
          variantInventories,
        );
        await manager.save(StoreInventory, inventoryEntities);

        return { product: newProduct, variants: newVariants };
      });
    } catch (error) {
      // Cleanup uploaded files if something failed
      if (uploadedImageUrls.length > 0) {
        for (const url of uploadedImageUrls) {
          try {
            const path = getPathFromUrl(url);
            await this.fileService.deleteFile(path, 'products');
          } catch (cleanupErr) {
            console.error('Failed to cleanup file:', cleanupErr);
          }
        }
      }

      // Re-throw handled error
      this.errorHandler.handleServiceError(error, 'createProductWithVariants');
      throw error;
    }
  }

  /**
   * Main method: update product and variants
   */
  async updateProductWithVariants(
    productId: string,
    updateDto: UpdateProductDto,
    storeId: string,
  ) {
    try {
      // Step 1: Update product
      await this.updateProduct(productId, updateDto);

      // Step 2: Process variants (update, add, or remove)
      for (const variant of updateDto.variants) {
        if (variant.id) {
          await this.updateVariantAndInventory(
            variant,
            storeId,
            updateDto.business_id as string,
          );
        } else {
          await this.createVariantAndInventory(
            productId,
            variant,
            storeId,
            updateDto.business_id as string,
          );
        }
      }

      // Step 3: Handle removed variants
      if (updateDto.removedVariantIds?.length > 0) {
        await this.removeVariants(updateDto.removedVariantIds, storeId);
      }

      return { message: 'Product and variants updated successfully' };
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'updateProductWithVariants');
    }
  }

  async deleteProductWithVariants(productId: string, businessId: string) {
    try {
      // 1. Fetch product and variants for cleanup
      const { data: product, error: fetchError } = await this.supabase
        .from('products')
        .select(
          `
        id,
        business_id,
        thumbnail,
        product_variants (
          id,
          image_url
        )
        `,
        )
        .eq('id', productId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (fetchError) throw new BadRequestException(fetchError.message);
      if (!product) throw new NotFoundException('Product not found');

      // 2. Collect image paths (thumbnail + variant images)
      const imagePaths: string[] = [];
      if (product.thumbnail) {
        imagePaths.push(getPathFromUrl(product.thumbnail));
      }
      if (product.product_variants?.length) {
        for (const variant of product.product_variants) {
          if (variant.image_url) {
            imagePaths.push(getPathFromUrl(variant.image_url));
          }
        }
      }

      // 3. Delete images from storage (if any)
      if (imagePaths.length > 0) {
        const { error: storageError } = await this.supabase.storage
          .from('products')
          .remove(imagePaths);

        if (storageError) {
          throw new BadRequestException(
            `Failed to delete images: ${storageError.message}`,
          );
        }
      }

      // 4. Delete the product (cascade will handle variants + inventory)
      const { error: deleteError } = await this.supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('business_id', businessId);

      if (deleteError) throw new BadRequestException(deleteError.message);

      return {
        message: 'Product and all related data deleted successfully',
      };
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'deleteProductWithVariants');
    }
  }

  /**
   * Update product details
   */
  private async updateProduct(productId: string, dto: UpdateProductDto) {
    // find category
    const categoryId = await this.handleCategory(dto);

    // update thumbnail
    if (dto.thumbnail) {
      dto.thumbnail = await this.handleThumbnail(dto, dto.thumbnail);
    }

    const { error } = await this.supabase
      .from('products')
      .update({
        name: dto.name,
        description: dto.description,
        tags: dto.tags,
        slug: generateSlug(dto.name),
        category: dto.category,
        thumbnail: dto.thumbnail,
        categoryId,
        brand: dto.brand,
      })
      .eq('id', productId);

    if (error) throw new BadRequestException(error.message);
  }

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
      .insert([{ name: dto.category, store_id: dto.store_id }])
      .select();

    if (insertError)
      throw new BadRequestException(
        'Supabase error creating category: ' + insertError.message,
      );

    return newCategory[0].id;
  }

  private async handleThumbnail(
    dto: any,
    newThumbnail: Multer.File,
  ): Promise<string> {
    if (dto.thumbnail) {
      const prevPath = getPathFromUrl(dto.thumbnail);
      await this.fileService.deleteFile(prevPath, 'products');
    }

    const path = `variants/${dto.business_id}/${Date.now()}_${
      newThumbnail.originalname
    }`;
    return await this.fileService.uploadFile(newThumbnail, path, 'products');
  }

  /**
   * Update an existing variant + inventory
   */
  private async updateVariantAndInventory(
    variant: any,
    storeId: string,
    businessId: string,
  ) {
    // Check wants to change variant image
    if (variant.image_file) {
      // Delete previous image from storage
      const previousPath = getPathFromUrl(variant.image_url);
      await this.fileService.deleteFile(previousPath, 'products');

      // Create new Image in storage
      const newPath = `variants/${businessId}/${Date.now()}_${
        variant.sku
      }${variant.image_file.originalname}`;
      const imageUrl = await this.fileService.uploadFile(
        variant.image_file,
        newPath,
        'products',
      );
      variant.image_url = imageUrl;
    }
    const { error: variantError } = await this.supabase
      .from('product_variants')
      .update({
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        image_url: variant.image_url,
        attributes: variant.attributes ?? {},
      })
      .eq('id', variant.id);

    if (variantError) throw new BadRequestException(variantError.message);

    const { error: inventoryError } = await this.supabase
      .from('store_inventory')
      .update({
        low_stock_threshold: variant.inventory.low_stock_threshold,
        reserved: variant.inventory.reserved,
      })
      .eq('variant_id', variant.id)
      .eq('store_id', storeId);

    if (inventoryError) throw new BadRequestException(inventoryError.message);
  }

  /**
   * Create a new variant + inventory
   */
  private async createVariantAndInventory(
    productId: string,
    variant: any,
    storeId: string,
    businessId: string,
  ) {
    // Create new Image in storage
    const path = `variants/${businessId}/${Date.now()}_${variant.sku}${
      variant.image_file.originalname
    }`;
    const imageUrl = await this.fileService.uploadFile(
      variant.image_file,
      path,
      'products',
    );
    variant.image_url = imageUrl;

    const { data: newVariant, error: variantError } = await this.supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        store_id: storeId,
        business_id: businessId,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        image_url: variant.image_url,
        attributes: variant.attributes ?? [],
      })
      .select('id')
      .maybeSingle();

    if (variantError) throw new BadRequestException(variantError.message);

    const { error: inventoryError } = await this.supabase
      .from('store_inventory')
      .insert({
        store_id: storeId,
        variant_id: newVariant?.id,
        quantity: variant.inventory.quantity || 0,
        low_stock_threshold: variant.inventory.low_stock_threshold,
        reserved: variant.inventory.reserved,
      });

    if (inventoryError) throw new BadRequestException(inventoryError.message);
  }

  /**
   * Remove variants (and inventory) by IDs
   */
  private async removeVariants(variantIds: string[], storeId: string) {
    // First delete inventory records
    const { error: inventoryError } = await this.supabase
      .from('store_inventory')
      .delete()
      .in('variant_id', variantIds)
      .eq('store_id', storeId);

    if (inventoryError) throw new BadRequestException(inventoryError.message);

    // Then delete variants
    const { data: variants, error: variantError } = await this.supabase
      .from('product_variants')
      .delete()
      .in('id', variantIds)
      .select();

    if (variantError) throw new BadRequestException(variantError.message);

    // Loop through each variant and delete image from storage
    for (const variant of variants) {
      const path = getPathFromUrl(variant.image_url);
      await this.fileService.deleteFile(path, 'products');
    }
  }
}
