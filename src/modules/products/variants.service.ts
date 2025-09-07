import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Express } from 'express';
import { Multer } from 'multer';
import { SupabaseClient } from '@supabase/supabase-js';
import { HandleErrorService } from 'src/helpers/handle-error.helper';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly errorHandler: HandleErrorService,
  ) {}

  /**
   *
   * @param businessId
   * @param dto
   * @param file
   * @returns a created variant payload
   */
  // Create variant. If file provided, upload image to Supabase storage
  async createVariant(
    businessId: string,
    productId: string,
    dto: CreateVariantDto,
    file?: Multer.File,
  ) {
    try {
      // verify variant exists
      const { data: variant } = await this.supabase
        .from('product_variants')
        .select('id')
        .eq('sku', dto.sku)
        .maybeSingle();

      if (variant)
        throw new ConflictException(
          `Product variant with sku ${dto.sku} already exists`,
        );

      let image_url = dto.image_url ?? null;

      if (file) {
        // upload file to 'products' bucket; path: variants/businessId/timestamp_sku.originalname
        const filePath = `variants/${businessId}/${Date.now()}_${dto.sku}${file.originalname}`;
        const { data: upload, error: uploadError } = await this.supabase.storage
          .from('products')
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw new BadRequestException(uploadError.message);

        // get public URL
        const { data } = this.supabase.storage
          .from('products')
          .getPublicUrl(upload.path);
        image_url = data.publicUrl;
      }

      const id = uuidv4();
      const payload = {
        id,
        product_id: productId,
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
        attributes: dto.attributes as any,
        image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('product_variants')
        .insert([payload]);
      if (error) {
        this.logger.error('Variant insert error', error);
        throw new BadRequestException(error.message);
      }

      return payload;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createVariant');
    }
  }

  async findByProduct(productId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(variantId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('*')
      .eq('id', variantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Variant not found');
    return data;
  }

  async update(variantId: string, dto: UpdateVariantDto, file?: Multer.File) {
    let image_url: string | undefined;
    if (file) {
      const filePath = `${variantId}/${Date.now()}-${file.originalname}`;
      const { data: upload, error: uploadError } = await this.supabase.storage
        .from('product-images')
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw new BadRequestException(uploadError.message);

      const { data } = this.supabase.storage
        .from('product-images')
        .getPublicUrl(upload.path);
      image_url = data.publicUrl;
    }

    const payload: any = { ...dto, updated_at: new Date().toISOString() };
    if (image_url) payload.image_url = image_url;

    const { error } = await this.supabase
      .from('product_variants')
      .update(payload)
      .eq('id', variantId);
    if (error) throw new BadRequestException(error.message);

    return { message: 'Variant updated' };
  }

  async remove(variantId: string) {
    const { error } = await this.supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId);
    if (error) throw new BadRequestException(error.message);
    return { message: 'Variant removed' };
  }
}
