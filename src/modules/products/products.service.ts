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
import { Product } from 'src/entities/product.entity';
import { VariantsService } from './variants.service';
import { getPathFromUrl } from 'src/utils/get-path';
import { FileUploadService } from 'src/utils/upload-file';
@Injectable()
export class ProductsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly errorHandler: HandleErrorService,
    private readonly variantService: VariantsService,
    private readonly fileService: FileUploadService,
  ) {}

  /**
   *
   * @param businessId
   * @param dto
   * @returns a product object
   */
  private async createProduct(
    businessId: string,
    dto: CreateProductDto,
  ): Promise<Product | undefined> {
    try {
      const id = uuidv4();
      const payload = {
        id,
        business_id: businessId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        brand: dto.brand ?? null,
        tags: dto.tags ?? [],
        slug: generateSlug(dto.name),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase.from('products').insert([payload]);
      if (error) throw new BadRequestException(error.message);

      return payload;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createProduct');
    }
  }

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
  async findAllByBusiness(businessId: string) {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(
          `
        id,
        name,
        description,
        category,
        brand,
        tags,slug,
        business_id,
        store_id,
        created_at,
        product_variants (
          id,
          name,
          sku,
          price,
          image,
          store_inventory (
            id,
            quantity,
            low_stock_threshold,
            status,
            updated_at,
            store_inventory_batches (
              id,
              batch_number,
              quantity,
              expiry_date,
              received_at,
              status
            )
          )
        )
      `,
        )
        .eq('business_id', businessId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findAllByBusiness');
    }
  }

  /**
   *
   * @param productId
   * @returns
   */
  async findOne(productId: string) {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(
          `
        id,
        name,
        description,
        category,
        brand,
        tags,
        slug,
        business_id,
        store_id,
        created_at,
        product_variants (
          id,
          name,
          sku,
          price,
          image,
          store_inventory (
            id,
            quantity,
            low_stock_threshold,
            status,
            updated_at,
            store_inventory_batches (
              id,
              batch_number,
              quantity,
              expiry_date,
              received_at,
              status
            )
          )
        )
      `,
        )
        .eq('id', productId)
        .maybeSingle();

      if (error) throw new BadRequestException(error.message);
      if (!data) throw new NotFoundException('Product not found');

      return data;
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findOne');
    }
  }

  /**
   *
   * @param storeId
   * @returns
   */
  async findAllByStore(storeId: string) {
    try {
      const { data, error } = await this.supabase
        .from('product_variants')
        .select(
          `
        id,
        name,
        sku,
        price,
        image,
        store_id,
        product:products (
          id,
          name,
          description,
          category,
          brand,
          tags,
          slug,
          business_id,
          created_at
        ),
        store_inventory (
          id,
          quantity,
          low_stock_threshold,
          status,
          updated_at,
          store_inventory_batches (
            id,
            batch_number,
            quantity,
            expiry_date,
            received_at,
            status
          )
        )
      `,
        )
        .eq('store_id', storeId);

      if (error) throw new BadRequestException(error.message);

      return data ?? [];
    } catch (err) {
      this.errorHandler.handleServiceError(err, 'findAllByStore');
    }
  }

  async update(productId: string, dto: UpdateProductDto) {
    const updatePayload: any = { ...dto, updated_at: new Date().toISOString() };
    const { error } = await this.supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Product updated' };
  }

  async remove(productId: string) {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', productId);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Product removed' };
  }

  /**
   *
   * @param businessId
   * @param dto
   * @returns
   */
  async createProductWithVariants(businessId: string, dto: CreateProductDto) {
    try {
      // Check if product already exists
      if (await this.doProductExists(dto.name, dto.business_id)) {
        throw new ConflictException('Product with this name already exists');
      }
      // 1. Create product
      const product = await this.createProduct(dto.business_id, dto);

      const createdVariants: any[] = [];

      // 2. Handle variants
      for (const variant of dto.variants) {
        // 2a. insert variant
        const newVariant = await this.variantService.createVariant(
          businessId,
          product?.id as string,
          variant,
          variant.image_url,
        );

        // 2b. Create inventory row
        await this.supabase.from('store_inventory').insert({
          store_id: dto.store_id,
          business_id: businessId,
          variant_id: newVariant?.id,
          quantity: variant.quantity,
          low_stock_threshold: variant.low_stock_threshold,
        });

        if (dto.track_batches) {
          // 2d. Create batch row
          await this.supabase.from('store_inventory_batches').insert({
            store_id: dto.store_id,
            business_id: businessId,
            variant_id: newVariant?.id,
            batch_number: `BATCH-${Date.now()}`,
            quantity: variant.quantity,
            received_at: new Date(),
            expiry_date: variant.expiry_date ?? null,
          });
        }

        createdVariants.push(newVariant);
      }

      return {
        product,
        variants: createdVariants,
        message: 'Product and variants created successfully',
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createProductWithVariants');
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
      for (const variant of updateDto.variants as any) {
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

  /**
   * Update product details
   */
  private async updateProduct(productId: string, dto: UpdateProductDto) {
    const { error } = await this.supabase
      .from('products')
      .update({
        name: dto.name,
        description: dto.description,
        tags: dto.tags,
        slug: generateSlug(dto.name),
        category: dto.category,
        brand: dto.brand,
      })
      .eq('id', productId);

    if (error) throw new BadRequestException(error.message);
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
      const newPath = `variants/${businessId}/${Date.now()}_${variant.sku}${variant.image_file.originalname}`;
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
        attributes: variant.attributes,
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
    const path = `variants/${businessId}/${Date.now()}_${variant.sku}${variant.image_file.originalname}`;
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
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        image_url: variant.image_url,
        attributes: variant.attributes,
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
