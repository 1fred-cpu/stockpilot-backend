import {
  Injectable,
  Inject,
  Logger,
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
import { FailedFileDeletion } from '../../entities/failed-file-deletion.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Category } from 'src/entities/category.entity';
import { QrcodeService } from '../qrcode/qrcode.service';

@Injectable()
export class ProductsService {
  private logger = new Logger(ProductsService.name);
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
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly qrcodeService: QrcodeService,
  ) {}

  /**
   *
   * @param name
   * @param storeId
   * @returns a array of categories created by  store
   */
  async findStoreCatgories(storeId: string) {
    try {
      const categories = await this.categoryRepo.find({
        where: { store_id: storeId },
      });

      if (categories.length === 0) {
        return [];
      }
      return categories;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findStoreCatgories');
    }
  }

  /**
   *
   * @param businessId
   * @returns
   */
  async findAllProductsByBusiness(businessId: string) {
    try {
      const products = await this.productRepo.find({
        where: {
          business_id: businessId,
        },
        relations: ['productVariants', 'productVariants.storeInventories'],
        select: {
          id: true,
          name: true,
          description: true,
          business_id: true,
          brand: true,
          category_type: true,
          tags: true,
          thumbnail: true,
          created_at: true,
          updated_at: true,
          productVariants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            storeInventories: true,
          },
        },
        order: { created_at: 'DESC' },
      });

      if (products.length === 0) {
        return [];
      }

      // transform inventories -> single object
      const normalizedProducts = products.map((p) => ({
        ...p,
        productVariants: p.productVariants.map((v) => ({
          ...v,
          inventory: v.storeInventories?.[0] || null, // pick the first one
          storeInventories: undefined, // remove original array form
        })),
      }));

      return normalizedProducts;
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
      const product = await this.productRepo.findOne({
        where: {
          productVariants: {
            store_id: storeId,
            product_id: productId,
          },
        },
        relations: ['productVariants', 'productVariants.storeInventories'],
        select: {
          id: true,
          name: true,
          description: true,
          business_id: true,
          brand: true,
          category_type: true,
          tags: true,
          thumbnail: true,
          created_at: true,
          updated_at: true,
          productVariants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            storeInventories: true,
          },
        },
        order: { created_at: 'DESC' },
      });

      if (!product) {
        throw new NotFoundException('Product not found ');
      }

      // transform inventories -> single object
      const normalizedProduct = {
        ...product,
        productVariants: product?.productVariants.map((v) => ({
          ...v,
          inventory: v.storeInventories?.[0] || null, // pick the first one
          storeInventories: undefined, // remove original array form
        })),
      };

      const discountedProduct: any = await this.discountsService.applyDiscounts(
        storeId,
        [normalizedProduct],
      );
      return { product: discountedProduct[0] };
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
      // Load only necessary fields + relations
      const products = await this.productRepo.find({
        where: {
          productVariants: { store_id: storeId },
        },
        relations: ['productVariants', 'productVariants.storeInventories'],
        select: {
          id: true,
          name: true,
          description: true,
          business_id: true,
          brand: true,
          category_type: true,
          tags: true,
          thumbnail: true,
          created_at: true,
          updated_at: true,
          productVariants: {
            id: true,
            name: true,
            sku: true,
            price: true,
            image_url: true,
            store_id: true,
            storeInventories: true,
          },
        },
        order: { created_at: 'DESC' },
      });

      // transform inventories -> single object
      const normalizedProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        businessId: p.business_id,
        brand: p.brand,
        categoryType: p.category_type,
        tags: p.brand,
        thumbnail: p.brand,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        productVariants: p.productVariants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.name,
          imageUrl: v.image_url,
          inventory: v.storeInventories?.[0] || null, // pick the first one
          storeInventories: undefined, // remove original array form
        })),
      }));

      const discountedProducts = await this.discountsService.applyDiscounts(
        storeId,
        normalizedProducts,
      );

      return { products: discountedProducts };
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findAllProductsByStore');
      throw err; // rethrow so higher layers know it failed
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
      for (const variant of dto.productVariants) {
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
      const path = `businesses/${
        dto.businessName.split(' ')[0]
      }/${uuidv4()}_${dto.thumbnailFile.originalname}`;
      const thumbnailUrl = await this.fileService.uploadFile(
        dto.thumbnailFile,
        path,
        'products',
      );
      uploadedImageUrls.push(thumbnailUrl);
      const productData = {
        id: uuidv4(),
        business_id: businessId,
        store_id: dto.storeId,
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
        dto.productVariants.map(async (variant) => {
          const path = `businesses/${
            dto.businessName.split(' ')[0]
          }/${uuidv4()}_${variant.imageFile.originalname}`;
          const imageUrl = await this.fileService.uploadFile(
            variant.imageFile,
            path,
            'products',
          );
          uploadedImageUrls.push(imageUrl);

          // Create a Qrcode for variant
          const qrcodeUrl = await this.qrcodeService.generateAndUploadQr(
            {
              variant_id: variant.id,
              product_id: productData.id,
              store_id: dto.storeId,
            },
            variant.id as string,
            dto.businessName,
          );
          uploadedImageUrls.push(qrcodeUrl);
          return {
            id: uuidv4(),
            product_id: productData.id,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            image_url: imageUrl,
            store_id: dto.storeId,
            business_id: businessId,
            qrcode_url: qrcodeUrl,
            created_at: now,
            updated_at: now,
          };
        }),
      );

      // 6. Inventories
      const variantInventories = variantsData.map((variant, index) => ({
        id: uuidv4(),
        business_id: businessId,
        store_id: dto.storeId,
        variant_id: variant.id,
        total_quantity: dto.productVariants[index].inventory.quantity,
        quantity: dto.productVariants[index].inventory.quantity,
        reserved: dto.productVariants[index].inventory.reserved,
        low_stock_quantity:
          dto.productVariants[index].inventory.lowStockQuantity,
        created_at: now,
        updated_at: now,
      }));

      // 7. Transaction (product + variants + inventories )
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
    const newFiles: string[] = []; // uploaded in this process
    const oldFiles: string[] = []; // existing that should be deleted after success

    try {
      // Check if any variant in updateDto already exists (by SKU) but with a different ID
      for (const variant of updateDto.productVariants) {
        if (variant.sku) {
          const existing = await this.variantRepo.findOne({
            where: { sku: variant.sku },
          });
          if (existing && (!variant.id || existing.id !== variant.id)) {
            throw new ConflictException(
              `Variant with sku ${variant.sku} already exists`,
            );
          }
        }
      }
      // Step 0: preload product & variants for old file tracking
      const existingProduct = await this.productRepo.findOne({
        where: {
          id: productId,
          productVariants: { store_id: storeId },
        },
        relations: ['productVariants', 'business'],
      });

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // If a new thumbnail was provided → upload & track old
      if (updateDto.thumbnailFile) {
        if (existingProduct.thumbnail) {
          oldFiles.push(getPathFromUrl(existingProduct.thumbnail));
        }

        const uploadedThumb = await this.fileService.uploadFile(
          updateDto.thumbnailFile,
          `businesses/${
            existingProduct.business.name.split(' ')[0]
          }/${uuidv4()}_${updateDto.thumbnailFile.originalname}`,
          'products',
        );
        newFiles.push(getPathFromUrl(uploadedThumb));
        updateDto.thumbnail = uploadedThumb;
      }

      // Preprocess variants: upload new images and track old ones
      for (const variant of updateDto.productVariants) {
        if (variant.imageFile) {
          if (variant.id) {
            const existingVariant = existingProduct.productVariants.find(
              (v) => v.id === variant.id,
            );
            if (existingVariant?.image_url) {
              oldFiles.push(getPathFromUrl(existingVariant.image_url));
            }
          }

          const uploadedImg = await this.fileService.uploadFile(
            variant.imageFile,
            `businesses/${
              existingProduct.business.name.split(' ')[0]
            }/${uuidv4()}_${variant.imageFile.originalname}`,
            'products',
          );
          newFiles.push(getPathFromUrl(uploadedImg));
          variant.imageUrl = uploadedImg;
        }
      }

      // Step 1 → run DB updates inside transaction
      await this.dataSource.transaction(async (manager) => {
        // Handle category if updated
        let categoryId = existingProduct.category_id;
        if (updateDto.category) {
          // Check if category exists for this store
          let category = await manager.findOne(Category, {
            where: { name: updateDto.category, store_id: storeId },
          });
          if (!category) {
            // Create new category
            category = manager.create(Category, {
              name: updateDto.category,
              store_id: storeId,
            });
            category = await manager.save(Category, category);
          }
          categoryId = category.id;
        }
        // Update product
        const productPayload = {
          name: updateDto.name,
          brand: updateDto.brand,
          description: updateDto.description,
          tags: updateDto.tags || [],
          category_id: categoryId,
          category_type: updateDto.category || existingProduct.category_type,
          updated_at: new Date(),
          // only update thumbnail if a new one was uploaded
          ...(updateDto.thumbnail && {
            thumbnail: updateDto.thumbnail,
          }),
        };
        await manager.update(Product, productId, productPayload);

        // Update or create variants
        for (const variant of updateDto.productVariants) {
          if (variant.id) {
            // Update variant
            const variantPayload = {
              name: variant.name,
              price: variant.price,
              image_url: variant.imageUrl,
            };
            await manager.update(ProductVariant, variant.id, variantPayload);

            // Update inventory
            const inventoryPayload = {
              reserved: variant?.inventory?.reserved,
              low_stock_quantity: variant?.inventory?.lowStockQuantity,
            };
            await manager.update(
              StoreInventory,
              { variant_id: variant.id, store_id: storeId },
              inventoryPayload,
            );
          } else {
            // Create variant

            const createdVariant = manager.create(ProductVariant, {
              id: uuidv4(),
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              product_id: productId,
              business_id: updateDto.businessId,
              image_url: variant.imageUrl,
              qrcode_url: '',
              store_id: storeId,
            });

            createdVariant.qrcode_url =
              await this.qrcodeService.generateAndUploadQr(
                {
                  variant_id: createdVariant.id,
                  store_id: createdVariant.store_id,
                  product_id: productId,
                },
                createdVariant.id,
                existingProduct.business.name,
              );
            newFiles.push(getPathFromUrl(createdVariant.qrcode_url));

            const savedVariant = await manager.save(createdVariant);

            // Create inventory
            const inventory = manager.create(StoreInventory, {
              id: uuidv4(),
              variant_id: savedVariant.id,
              store_id: storeId,
              business_id: updateDto.businessId,
              quantity: variant.inventory?.quantity || 0,
              total_quantity: variant.inventory?.quantity || 0,
              reserved: variant.inventory?.reserved || 0,
              low_stock_quantity: variant.inventory?.lowStockQuantity || 0,
            });
            await manager.save(inventory);
          }
        }

        // Handle removed variants
        if (updateDto.removedVariantIds?.length > 0) {
          for (const variantId of updateDto.removedVariantIds) {
            const variant = existingProduct.productVariants.find(
              (v) => v.id === variantId,
            );
            if (variant?.image_url) {
              oldFiles.push(getPathFromUrl(variant.image_url));
              oldFiles.push(getPathFromUrl(variant.qrcode_url));
            }
            await manager.delete(StoreInventory, {
              variant_id: variantId,
              store_id: storeId,
            });
            await manager.delete(ProductVariant, { id: variantId });
          }
        }
      });

      // Step 2 → Transaction succeeded → cleanup old files
      for (const oldPath of oldFiles) {
        try {
          await this.fileService.deleteFile(oldPath, 'products');
        } catch (e) {
          // Log and continue, don't fail user update
          console.error('Failed to delete old file:', oldPath, e);
        }
      }

      const product = await this.findProduct(productId, storeId);
      return {
        message: 'Product and variants updated successfully',
        credentials: product,
      };
    } catch (err) {
      // Transaction failed → cleanup new uploads to avoid orphans
      for (const newPath of newFiles) {
        try {
          await this.fileService.deleteFile(newPath, 'products');
        } catch (e) {
          console.error('Failed to cleanup uploaded file:', newPath, e);
        }
      }

      this.errorHandler.handleServiceError(err, 'updateProductWithVariants');
    }
  }
  async deleteProductWithVariants(productId: string, businessId: string) {
    return this.dataSource
      .transaction(async (manager) => {
        try {
          // 1. Fetch product with variants
          const product = await manager.getRepository(Product).findOne({
            where: { id: productId, business_id: businessId },
            relations: ['productVariants', 'business'],
          });

          if (!product) {
            throw new NotFoundException('Product not found');
          }

          // 2. Collect image paths
          const imagePaths: string[] = [];
          if (product.thumbnail) {
            imagePaths.push(getPathFromUrl(product.thumbnail));
          }
          if (product.productVariants?.length) {
            for (const variant of product.productVariants) {
              if (variant.image_url) {
                imagePaths.push(getPathFromUrl(variant.image_url));
                imagePaths.push(getPathFromUrl(variant.qrcode_url));
              }
            }
          }

          // 3. Delete product (cascade deletes variants + inventories)
          await manager.getRepository(Product).delete({
            id: productId,
            business_id: businessId,
          });

          // Return paths for post-commit cleanup
          return { imagePaths };
        } catch (err) {
          this.errorHandler.handleServiceError(
            err,
            'deleteProductWithVariants',
          );
          throw err; // rollback DB
        }
      })
      .then(async ({ imagePaths }) => {
        // 4. Attempt storage cleanup
        if (imagePaths.length > 0) {
          const { error: storageError } = await this.supabase.storage
            .from('products')
            .remove(imagePaths);

          if (storageError) {
            // 5. If failed, enqueue for retry
            for (const path of imagePaths) {
              await this.dataSource.getRepository(FailedFileDeletion).insert({
                bucket_name: 'products',
                path,
                error_message: storageError.message,
              });
            }

            this.logger.error(
              `Queued ${imagePaths.length} files for retry due to storage deletion error: ${storageError.message}`,
            );
          }
        }

        return {
          message: 'Product and all related data deleted successfully',
        };
      });
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
      .insert([{ name: dto.category, store_id: dto.storeId }])
      .select();

    if (insertError)
      throw new BadRequestException(
        'Supabase error creating category: ' + insertError.message,
      );

    return newCategory[0].id;
  }
}
