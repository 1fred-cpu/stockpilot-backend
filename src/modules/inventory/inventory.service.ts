import {
  BadRequestException,
  Injectable,
  Inject,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { StockChangeDto } from './dto/stock-change.dto';
import { MailService } from 'utils/mail/mail.service';

@Injectable()
export class InventoryService {
  private logger = new Logger(InventoryService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    private readonly mailService: MailService,
  ) {}

  async stockMove(dto: StockChangeDto) {
    try {
      const { data, error } = await this.supabase.rpc('fn_adjust_stock', {
        p_inventory_id: dto.inventory_id,
        p_change: dto.change,
        p_type: dto.type,
        p_reason: dto.reason || null,
        p_reference_id: dto.reference_id || null,
        p_user_id: dto.created_by || null,
        p_idempotency_key: dto.idempotency_key || null,
      });
      if (error) throw new BadRequestException(error.message);
      // data is an array of returned rows from the function
      const results = data[0];

      if (results.alert_created) {
        const { data, error } = await this.supabase
          .from('inventories')
          .select(`product_id, products(store_id,stores(contact_email))`)
          .eq('inventory_id', dto.inventory_id)
          .single();

        if (error) {
          throw new BadRequestException(error.message);
        }

        const storeEmail = data.products.stores.contact_email;
        await this.mailService.sendMail(
          'recipient@example.com',
          'Stock Alert',
          `<p>Stock alert created for inventory ID: ${dto.inventory_id}</p>`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error processing stock move', error);
      throw new InternalServerErrorException(
        'An error occurred while processing the stock move',
        error.message,
      );
    }
  }
}
