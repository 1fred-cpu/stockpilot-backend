import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { HandleErrorService } from 'src/helpers/handle-error.helper';
import { v4 as uuidv4 } from 'uuid';
import { CreateStoreDto } from './dto/create-store.dto';
import { KafkaHelper } from '../../helpers/kafka.heper';
import { SupabaseClient } from '@supabase/supabase-js';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import EventEmitter2 from 'eventemitter2';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { MailService } from 'src/utils/mail/mail.service';
import { SendInviteDto } from './dto/send-invite.dto';
import { generateExpiry } from 'src/utils/expiry';
import { User } from '../users/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { Repository } from 'typeorm';
import { Business } from 'src/entities/business.entity';
import { SaleItem } from 'src/entities/sale-item.entity';
import { Product } from 'src/entities/product.entity';
import { StoreInventory } from 'src/entities/store-inventory.entity';
@Injectable()
export class StoresService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly errorHandler: HandleErrorService,
    private readonly mailService: MailService,
    private readonly eventEmitterHelper: EventEmitterHelper,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(StoreInventory)
    private readonly storeInventoryRepo: Repository<StoreInventory>,
  ) {}

  /* CREATE STORE METHOD */
  /**
   *
   * @param dto
   * @returns a created store data
   */
  async createStore(dto: CreateStoreDto) {
    try {
      // Check if store with same name and business_id exists for the business
      if (
        await this.doStoreExists(dto.business_id, dto.store_name, dto.location)
      ) {
        throw new ConflictException(
          'Store with this business ID, name and location already exists',
        );
      }

      // Define a store data
      const store = {
        id: uuidv4(),
        business_id: dto.business_id,
        name: dto.store_name,
        timezone: dto.timezone,
        currency: dto.currency,
        location: dto.location,
        created_at: new Date().toISOString(),
      };

      // Insert into Supabase
      const { error: createError } = await this.supabase
        .from('stores')
        .insert([store]);

      if (createError) {
        throw new BadRequestException(createError.message);
      }

      // // Emit Kafka event
      // await this.kafkaHelper.emitEvent(
      //   'store.events',
      //   store.business_id,
      //   'StoreCreated',
      //   store,
      // );

      return store;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createStore');
    }
  }

  /**  FIND A STORE METHOD */
  async findStore(storeId: string) {
    try {
      const store = await this.getStore(storeId);
      if (!store) {
        throw new NotFoundException("Can't find a store with this store ID");
      }
      return store;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findStore');
    }
  }

  /** FIND ALL STORES FOR A BUSINESS */
  /**
   *
   * @param businessId
   * @returns a empty array if not found or store data in an array
   */
  async findAllStores(businessId: string) {
    try {
      // 1. Check if business exists
      const existingBusiness = await this.businessRepo.findOne({
        where: { id: businessId },
      });

      if (!existingBusiness) {
        throw new NotFoundException('Business with this ID does not exist');
      }

      // 2. Fetch stores with relations
      const stores = await this.storeRepo.find({
        where: { business_id: businessId },
        relations: ['users'], // include users (with role info)
      });

      if (stores.length === 0) {
        return [];
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // 3. For each store, aggregate today's sales, stock counts, and managers
      const results = await Promise.all(
        stores.map(async (store) => {
          // ---- Get today's sales ----
          const salesData = await this.saleItemRepo
            .createQueryBuilder('saleItem')
            .select('SUM(saleItem.total_price)', 'totalRevenue')
            .addSelect('SUM(saleItem.quantity)', 'totalQuantity')
            .where('saleItem.store_id = :storeId', { storeId: store.id })
            .andWhere('saleItem.created_at BETWEEN :start AND :end', {
              start: startOfDay,
              end: endOfDay,
            })
            .getRawOne<{ totalRevenue: string; totalQuantity: string }>();

          // ---- Get total products count (per store) ----
          const totalProducts = await this.productRepo.count({
            where: { business_id: businessId },
          });

          // ---- Get low stock products count (from store_inventory) ----
          const lowStockProducts = await this.storeInventoryRepo
            .createQueryBuilder('inventory')
            .where('inventory.store_id = :storeId', { storeId: store.id })
            .andWhere('inventory.quantity < :threshold', { threshold: 5 }) // threshold configurable
            .getCount();

          return {
            ...store,
            todays_sales: {
              revenue: Number(salesData?.totalRevenue || 0),
              quantity: Number(salesData?.totalQuantity || 0),
            },
            stock: {
              total_products: totalProducts,
              low_stock_count: lowStockProducts,
            },
            managers: store.users
              .filter((user) => user.role === 'Admin')
              .map((manager) => ({
                id: manager.id,
                name: manager.name,
                email: manager.email,
              })),
          };
        }),
      );

      return results;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findAllStores');
    }
  }

  /** FIND STORE AND UPDATE */
  /**
   *
   * @param storeId
   * @param dto
   * @returns a updated store data
   */
  async updateStore(storeId: string, dto: UpdateStoreDto) {
    try {
      // returns a store , throws an error when not found
      await this.getStore(storeId);

      // Update store with the new data
      const { data: updatedStore, error: updateError } = await this.supabase
        .from('stores')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', storeId)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new BadRequestException(updateError.message);
      }

      return updatedStore;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'updateStore');
    }
  }

  /** DELETE STORE METHOD  */
  /**
   *
   * @param storeId
   * @returns a deleted store data
   */
  async deleteStore(storeId: string) {
    try {
      // returns a store or throws an error when not found
      await this.getStore(storeId);

      // Delete store
      const { data: deletedStore, error: deleteError } = await this.supabase
        .from('stores')
        .delete()
        .eq('id', storeId)
        .select()
        .maybeSingle();

      if (deleteError) {
        throw new BadRequestException(deleteError.message);
      }

      return deletedStore;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deleteStore');
    }
  }

  /**
   *
   * @param storeId
   * @returns a empty array if not found or returns a array of strings containing categories
   */
  async getStoreProductsCategories(storeId: string) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('name')
        .eq('storeId', storeId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((category) => category.name);
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getStoreProductsCategories');
    }
  }

  /**  SENDS A INVITE EMAIL */
  /**
   *
   * @param dto
   * @returns a invite data
   */
  async sendInvite(dto: SendInviteDto) {
    try {
      // 1. Check if store exists
      const store = await this.getStore(dto.store_id as string);

      if (!store) {
        throw new UnauthorizedException(
          'You are unauthorized to send invite email with unknown store ID',
        );
      }
      // 2. Check if invited user already exists in store
      if (await this.doUserExistsInStore(dto.store_id as string, dto.email)) {
        throw new ConflictException(
          "Can't send an invite to a user who already exists in a store",
        );
      }
      // 2. Check if invite exists
      const { data: existingInvite, error: fetchError } = await this.supabase
        .from('invites')
        .select('id')
        .match({
          store_id: dto.store_id,
          business_id: dto.business_id,
          email: dto.email,
        })
        .maybeSingle();
      if (fetchError) {
        throw new BadRequestException(fetchError.message);
      }
      if (existingInvite) {
        throw new ConflictException('Invite for this email already exists');
      }

      // 2. Define invite data
      const inviteData = {
        id: uuidv4(),
        business_id: dto.business_id,
        store_id: dto.store_id as string,
        role: dto.role,
        email: dto.email,
        invited_by: dto.invitedBy,
        expires_at: generateExpiry(72), // generate 3hours expiry time,
        created_at: new Date().toISOString(),
      };

      // 3. Insert invite data to database
      const { error: createInviteError } = await this.supabase
        .from('invites')
        .insert(inviteData);
      if (createInviteError) {
        throw new BadRequestException(createInviteError.message);
      }

      // 4. Emit a user.events (UserInviteSend)
      await this.eventEmitterHelper.emitEvent(
        'user.events',
        dto.store_id as string,
        'UserInviteSend',
        {
          ...inviteData,
          store_name: dto.store_name,
          location: dto.location,
        },
      );

      return inviteData;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'sendInvite');
    }
  }

  /** INVITES A USER TO JOIN A STORE */
  /**
   *
   * @param storeId
   * @param dto
   * @returns a message and user_id
   */
  async inviteUser(storeId: string, dto: InviteUserDto) {
    try {
      // 1. Check if invite already exists for this store + email
      const { data: existingInvite, error: inviteError } = await this.supabase
        .from('invites')
        .select('id')
        .eq('id', dto.invite_id)
        .eq('email', dto.email)
        .maybeSingle();

      if (inviteError) throw new BadRequestException(inviteError.message);

      if (!existingInvite) {
        throw new UnauthorizedException('There is no invite for this email');
      }

      // 2. Check if user exists in users table
      const { data: existingUser, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', dto.email)
        .maybeSingle();

      if (userError) throw new BadRequestException(userError.message);

      if (existingUser) {
        throw new ConflictException(
          'Invited user with this email already exists in store',
        );
      }
      // 3a. Create user in Supabase Auth
      const { data: authUser, error: authError } =
        await this.supabase.auth.admin.createUser({
          email: dto.email,
          password: dto.password,
          email_confirm: true,
          user_metadata: { name: dto.name },
        });

      if (authError) throw new BadRequestException(authError.message);

      // 3b. Insert into users table
      const { error: insertError } = await this.supabase.from('users').insert({
        id: authUser.user.id,
        email: dto.email,
        name: dto.name,
        status: 'invited',
        business_id: dto.business_id,
      });

      if (insertError) throw new BadRequestException(insertError.message);

      // 4. Emit UserAssignedRole event
      this.eventEmitterHelper.emitEvent(
        'user.events',
        dto.business_id,
        'UserAssignedRole',
        {
          business_id: dto.business_id,
          store_id: storeId,
          user_id: authUser.user.id,
          email: dto.email,
          role: dto.role,
          status: 'active',
        },
      );
      // 5. Delete invite from supabase
      const { error: deleteError } = await this.supabase
        .from('invites')
        .delete()
        .eq('id', dto.invite_id);
      if (deleteError) throw new BadRequestException(deleteError.message);

      return {
        message: 'User invited successfully',
        user_id: authUser.user.id,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'inviteUser');
    }
  }

  /**
   *
   * @param storeId
   * @param userId
   * @returns a user from a store
   */

  async getUserFromStore(storeId: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('store_users')
        .select(
          `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `,
        )
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data) {
        throw new NotFoundException('User not found in this store');
      }

      // Handle `users` as either object or array
      const userProfile = Array.isArray(data.users)
        ? data.users[0] // take first if array
        : data.users; // use directly if object

      return {
        id: data.id,
        store_id: data.store_id,
        user_id: data.user_id,
        role: data.role,
        status: data.status,
        business_id: data.business_id,
        user: {
          name: userProfile?.name ?? null,
          email: userProfile?.email ?? null,
        },
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getUserFromStore');
    }
  }

  /**
   *
   * @param storeId
   * @returns all users from a store
   */

  async findAllUsersFromStore(storeId: string) {
    try {
      const { data, error } = await this.supabase
        .from('store_users')
        .select(
          `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `,
        )
        .eq('store_id', storeId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row: any) => {
        // Handle `users` as object or array
        const userProfile = Array.isArray(row.users) ? row.users[0] : row.users;

        return {
          id: row.id,
          store_id: row.store_id,
          user_id: row.user_id,
          role: row.role,
          status: row.status,
          business_id: row.business_id,
          user: {
            name: userProfile?.name ?? null,
            email: userProfile?.email ?? null,
          },
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findAllUsersFromStore');
    }
  }

  /**
   *
   * @param businessId
   * @returns all users from a business
   */

  async findAllUsersFromBusiness(businessId: string) {
    try {
      const { data, error } = await this.supabase
        .from('store_users')
        .select(
          `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `,
        )
        .eq('business_id', businessId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row: any) => {
        // Handle `users` as object or array
        const userProfile = Array.isArray(row.users) ? row.users[0] : row.users;

        return {
          id: row.id,
          store_id: row.store_id,
          user_id: row.user_id,
          role: row.role,
          status: row.status,
          business_id: row.business_id,
          user: {
            name: userProfile?.name ?? null,
            email: userProfile?.email ?? null,
          },
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findAllUsersFromBusiness');
    }
  }

  /**
   *
   * @param businessId
   * @param userId
   * @returns a message
   */
  async removeUserCompletely(
    businessId: string,
    userId: string,
  ): Promise<{ message: string } | undefined> {
    try {
      // Prevent business owner from deleting
      const { data: owner, error: ownerError } = await this.supabase
        .from('businesses')
        .select('id')
        .eq('owner_user_id', userId)
        .eq('id', businessId)
        .maybeSingle();

      if (ownerError) {
        throw new UnauthorizedException(ownerError.message);
      }
      if (owner) {
        return { message: "Business owner can't be removed" };
      }
      // 1. Check if user exists in this business
      const { data: existingUser, error: userError } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (userError) {
        throw new BadRequestException(userError.message);
      }

      if (!existingUser) {
        throw new NotFoundException('User not found in this business');
      }

      // 2. Emit a event UserDeleted
      await this.eventEmitterHelper.emitEvent(
        'user.events',
        businessId,
        'UserDeleted',
        {
          business_id: businessId,
          user_id: userId,
        },
      );

      return { message: `User ${existingUser.email} removed completely` };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'removeUserCompletely');
    }
  }

  /**
   *
   * @param userId
   * @param businessId
   * @param dto
   * @returns a message
   */
  async updateUser(
    userId: string,
    businessId: string,
    dto: UpdateUserDto,
  ): Promise<{ message: string }> {
    try {
      //  Check if user exists
      if (dto.old_email && dto.new_email) {
        const { data: existingUser, error: existsError } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', dto.old_email)
          .maybeSingle();

        if (existsError) {
          throw new BadRequestException(existsError.message);
        }
        if (!existingUser) {
          throw new NotFoundException("Can't find a user with this email");
        }

        // Prevent duplicate of emails when updating
        const { data: existingEmail, error: fetchError } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', dto.new_email)
          .maybeSingle();

        if (fetchError) {
          throw new BadRequestException(fetchError.message);
        }
        if (existingEmail) {
          throw new ConflictException('The new email provided already in use');
        }
      }

      // 1. If email exists → update in Supabase Auth
      const authPayload: any = {};
      if (dto.new_email) {
        authPayload.email = dto.new_email;
      }
      if (dto.password) {
        authPayload.password = dto.password;
      }

      if (Object.keys(authPayload).length > 0) {
        const { error: authError } =
          await this.supabase.auth.admin.updateUserById(userId, authPayload);

        if (authError) {
          throw new BadRequestException(authError.message);
        }
      }

      // 2. Update users table
      const userUpdateData: any = {};
      if (dto.new_email) userUpdateData.email = dto.new_email;
      if (dto.name) userUpdateData.name = dto.name;

      if (Object.keys(userUpdateData).length > 0) {
        const { error: usersError } = await this.supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', userId)
          .eq('business_id', businessId);

        if (usersError) throw new BadRequestException(usersError.message);
      }

      // 3. Update store_users table (role, status, email if you store it here)
      const storeUserUpdateData: any = {};
      if (dto.new_email) storeUserUpdateData.email = dto.new_email; // only if stored

      if (Object.keys(storeUserUpdateData).length > 0) {
        const { error: storeUsersError } = await this.supabase
          .from('store_users')
          .update(storeUserUpdateData)
          .eq('user_id', userId)
          .eq('business_id', businessId);

        if (storeUsersError) {
          throw new BadRequestException(storeUsersError.message);
        }
      }

      return { message: 'User updated successfully' };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'updateUser');
      throw error;
    }
  }

  /** Helpers method */
  /**
   *
   * @param storeId
   * @param email
   * @returns a true if user exists or false if not
   */
  // Check if user exists in a store
  private async doUserExistsInStore(
    storeId: string,
    email: string,
  ): Promise<boolean> {
    const { data: existingStoreMember, error: fetchError } = await this.supabase
      .from('store_users')
      .select('id')
      .match({
        store_id: storeId,
        email,
      })
      .maybeSingle();
    if (fetchError) {
      throw new BadRequestException(fetchError.message);
    }
    if (existingStoreMember) {
      return true;
    } else {
      return false;
    }
  }
  /**
   *
   * @param business_id
   * @param name
   * @param location
   * @returns a true if store exists or false if not
   */
  // Check store exists
  private async doStoreExists(
    business_id: string,
    name: string,
    location,
  ): Promise<boolean> {
    const { data: existsStore, error: existsError } = await this.supabase
      .from('stores')
      .select('id')
      .match({ business_id, name, location })
      .maybeSingle();

    if (existsError) {
      throw new BadRequestException('Error checking store existence');
    }

    return existsStore !== null;
  }

  /**
   *
   * @param storeId
   * @returns a store data or undefined
   */
  // Get a store
  private async getStore(storeId: string) {
    const { data: store, error: fetchError } = await this.supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();
    if (fetchError) {
      throw new BadRequestException(fetchError.message);
    }

    if (!store) {
      return undefined;
    }
    return store;
  }
}
