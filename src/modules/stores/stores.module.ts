import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import { FileUploadService } from 'src/utils/upload-file';
import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { MailModule } from 'src/utils/mail/mail.module';
import { UserEventsListener } from '../../event-listeners/user-events.listener';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { Business } from 'src/entities/business.entity';
import { SaleItem } from 'src/entities/sale-item.entity';
import { Product } from 'src/entities/product.entity';
import { ProductVariant } from 'src/entities/product-variants.entity';
import { StoreInventory } from 'src/entities/store-inventory.entity';
import { StoreUser } from 'src/entities/store-user.entity';
import { User } from 'src/entities/user.entity';
import { JwtHelper } from 'src/helpers/jwt.helper';
@Module({
  imports: [
    SupabaseModule,
    MailModule,
    TypeOrmModule.forFeature([
      Store,
      Business,
      SaleItem,
      Product,
      StoreInventory,
      StoreUser,
      User,
    ]),
  ],
  controllers: [StoresController],
  providers: [
    StoresService,
    FileUploadService,
    HandleErrorService,
    UserEventsListener,
    EventEmitterHelper,
    JwtHelper,
  ],
})
export class StoresModule {}
