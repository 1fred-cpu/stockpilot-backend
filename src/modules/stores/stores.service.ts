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
import { UpdateStoreUsersDto } from './dto/update-store-users.dto';
import { CreateStoreDto } from './dto/create-store.dto';

import { SupabaseClient } from '@supabase/supabase-js';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { EventEmitterHelper } from 'src/helpers/event-emitter.helper';
import { MailService } from 'src/utils/mail/mail.service';
import { SendInviteDto } from './dto/send-invite.dto';
import { generateExpiry } from 'src/utils/expiry';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { Repository, DataSource } from 'typeorm';
import { Business } from 'src/entities/business.entity';
import { SaleItem } from 'src/entities/sale-item.entity';
import { Product } from 'src/entities/product.entity';
import { StoreInventory } from 'src/entities/store-inventory.entity';
import { StoreUser } from 'src/entities/store-user.entity';
import { Resend } from 'resend';
import { Invite } from '../../entities/invite.entity';
import { ConfigService } from '@nestjs/config';
import { JwtHelper } from 'src/helpers/jwt.helper';
@Injectable()
/**
 * Service responsible for managing store-related operations within a business context.
 *
 * The `StoresService` provides methods for creating, updating, retrieving, and deleting stores,
 * as well as managing store users, handling invitations, and integrating with external services
 * such as Supabase and Resend for authentication and email notifications.
 *
 * ## Features
 * - Create, update, and delete stores with transactional integrity.
 * - Retrieve stores and aggregate sales, inventory, and user role data.
 * - Manage store users: assign roles, remove users, and update user information.
 * - Send and accept store invitations with secure token-based flows.
 * - Integrate with Supabase for authentication and data consistency.
 * - Send transactional emails using Resend.
 * - Emit business events for user deletion and other actions.
 *
 * ## Dependencies
 * - `ConfigService`: Application configuration provider.
 * - `SupabaseClient`: Supabase client for authentication and data operations.
 * - `HandleErrorService`: Centralized error handling.
 * - `MailService`: Email sending service.
 * - `EventEmitterHelper`: Event emission for business logic.
 * - TypeORM repositories for `Store`, `SaleItem`, `Business`, `Product`, `StoreInventory`, `StoreUser`, and `User`.
 * - `DataSource`: TypeORM data source for transactions.
 * - `JwtHelper`: Helper for JWT token generation and verification.
 *
 * ## Example Usage
 * ```typescript
 * const store = await storesService.createStore(createStoreDto);
 * const stores = await storesService.findAllStores(businessId);
 * await storesService.sendInvite(storeId, inviteDto);
 * await storesService.acceptInvite(token, { name, password });
 * ```
 *
 * @remarks
 * All methods are designed to be used within a NestJS application context and leverage dependency injection.
 * Error handling is centralized via `HandleErrorService`.
 *
 * @see CreateStoreDto
 * @see UpdateStoreDto
 * @see SendInviteDto
 * @see UpdateStoreUsersDto
 * @see UpdateUserDto
 */
export class StoresService {
  private resend: Resend;
  constructor(
    private readonly config: ConfigService,
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
    @InjectRepository(StoreUser)
    private readonly storeUserRepo: Repository<StoreUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtHelper: JwtHelper,
  ) {
    this.resend = new Resend(this.config.get<string>(`RESEND_API_KEY`));
  }

  /**
   * Creates a new store within a business.
   *
   * This method ensures that a store with the same name and business ID does not already exist.
   * It creates the store, assigns the owner as a store user with the "Owner" role, and ensures
   * transactional integrity for all related operations.
   *
   * @param dto - Data Transfer Object containing store creation details.
   * @returns The newly created store entity.
   * @throws ConflictException if a store with the same name and business ID already exists.
   * @throws NotFoundException if the owner user does not exist.
   * @throws InternalServerErrorException for any other errors during creation.
   */
  async createStore(dto: CreateStoreDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Check if store with same name and business_id exists for the business
        const existingStore = await this.storeRepo.findOne({
          where: {
            name: dto.store_name,
            business_id: dto.business_id,
          },
        });
        if (existingStore) {
          throw new ConflictException(
            'Store with this business ID and name already exists',
          );
        }

        // Create a store data
        const storeData = manager.create(Store, {
          id: uuidv4(),
          business_id: dto.business_id,
          name: dto.store_name,
          address: dto.address,
          email: dto.email,
          phone: dto.phone,
          currency: dto.currency,
          location: dto.location,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        const newStore = await manager.save(Store, storeData);

        // Fetch owner details
        const owner = await this.userRepo.findOne({
          where: { id: dto.owner_id },
        });

        // Assigned store owner in new store
        const storeOwnerAssigned = manager.create(StoreUser, {
          id: uuidv4(),
          store_id: storeData.id,
          user_id: dto.owner_id,
          business_id: dto.business_id,
          email: owner?.email,
          role: 'Owner',
          status: 'active',
          assigned_at: new Date(),
        });

        await manager.save(StoreUser, storeOwnerAssigned);

        return newStore;
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createStore');
    }
  }
  /**
   * Finds a store by its ID, including its users and their roles.
   * @param storeId - The ID of the store to retrieve.
   * @returns The store data with user details and roles.
   * @throws NotFoundException if the store does not exist.
   * @throws InternalServerErrorException if something fails.
   */
  async findStore(storeId: string) {
    try {
      const store = await this.storeRepo.findOne({
        where: { id: storeId },
        relations: ['storeUsers', 'storeUsers.user'],
      });
      console.log(store);
      if (!store) {
        throw new NotFoundException('Cannot find store');
      }
      // Enhance: Add total users and roles summary
      const users = store.storeUsers.map((u) => ({
        id: u.user.id,
        name: u.user.name,
        email: u.user.email,
        role: u.role,
        status: u.status,
      }));

      const rolesSummary = users.reduce(
        (acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        ...store,
        storeUsers: users,
        totalUsers: users.length,
        rolesSummary,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'findStore');
    }
  }

  /** FIND ALL STORES FOR A BUSINESS */
  /**
   * Retrieves all stores for a given business, including aggregated sales, stock, and manager data.
   *
   * - Checks if the business exists.
   * - Fetches all stores for the business, including users and their roles.
   * - For each store, aggregates today's sales (revenue and quantity), total products, low stock count, and manager info.
   *
   * @param businessId - The ID of the business.
   * @returns An array of store data with sales, stock, and manager summaries. Returns an empty array if no stores found.
   * @throws NotFoundException if the business does not exist.
   * @throws InternalServerErrorException for any other errors.
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
        relations: ['storeUsers', 'storeUsers.user'], // include users (with role info)
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
            .where('saleItem.store_id = :storeId', {
              storeId: store.id,
            })
            .andWhere('saleItem.created_at BETWEEN :start AND :end', {
              start: startOfDay,
              end: endOfDay,
            })
            .getRawOne<{
              totalRevenue: string;
              totalQuantity: string;
            }>();

          // ---- Get total products count (per store) ----
          const totalProducts = await this.productRepo.count({
            where: { store_id: store.id },
          });

          // ---- Get low stock products count (from store_inventory) ----
          const lowStockProducts = await this.storeInventoryRepo
            .createQueryBuilder('inventory')
            .where('inventory.store_id = :storeId', {
              storeId: store.id,
            })
            .andWhere('inventory.quantity < :threshold', {
              threshold: 5,
            }) // threshold configurable
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
            managers: store.storeUsers
              .filter((user) => user.role === 'Owner' || 'Admin')
              .map((manager) => ({
                id: manager.id,
                name: manager.user.name,
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
  /**
   * Sends an invitation email to a user to join a store.
   *
   * - Verifies the store exists.
   * - Checks if the user already exists in the store.
   * - Creates an invite record with an expiry.
   * - Generates a secure invite token.
   * - Sends a transactional email with the invite link.
   *
   * @param storeId - The ID of the store to invite the user to.
   * @param dto - Data Transfer Object containing invite details (email, business_id, role, invited_by).
   * @returns An object containing the invite status, invite ID, email, and expiry date.
   * @throws NotFoundException if the store does not exist.
   * @throws ConflictException if the user already exists in the store.
   * @throws InternalServerErrorException for any other errors.
   */
  async sendInvite(storeId: string, dto: SendInviteDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Ensure store exists
        const store = await manager.findOne(Store, {
          where: { id: storeId },
        });
        if (!store) throw new NotFoundException(`Store ${storeId} not found`);

        // 2. Check if user already in store
        const existingUser = await manager.findOne(User, {
          where: { email: dto.email },
        });
        if (existingUser) {
          const existsInStore = await manager.findOne(StoreUser, {
            where: {
              user: { id: existingUser.id },
              store: { id: storeId },
            },
          });
          if (existsInStore) {
            throw new ConflictException('User already exists in store');
          }
        }

        // 3. Create invite record with expiry
        const invite = manager.create(Invite, {
          email: dto.email,
          business_id: dto.business_id,
          store_id: storeId,
          role: dto.role ?? 'member',
          invited_by: dto.invited_by,
          expires_at: generateExpiry(48), // 48h expiry
        });
        await manager.save(invite);

        // 4. Generate invite token
        const inviteToken = await this.jwtHelper.generateToken(
          invite.id,
          generateExpiry(48),
        );

        const inviteUrl = `${this.config.get('FRONTEND_URL')}/accept-invite?token=${inviteToken}`;

        // 5. Send email via Resend
        await this.resend.emails.send({
          from: `${this.config.get('GMAIL_USER')}`,
          to: dto.email,
          subject: `You're invited to join ${store.name}`,
          html: `
        <p>Hello,</p>
        <p>You were invited to join <strong>${store.name}</strong>.</p>
        <p>Click below to accept the invite:</p>
        <p><a href="${inviteUrl}">Accept Invite</a></p>
        <p>This link will expire in ${invite.expires_at.toLocaleDateString()}.</p>
      `,
        });

        return {
          message: 'Invite sent successfully',
          invite_id: invite.id,
          email: invite.email,
          expires_at: invite.expires_at,
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'sendInvite');
    }
  }

  /**
   * Accepts an invite by validating the provided token and completing the user setup.
   *
   * @param token - A signed JWT or unique invite token associated with the invitation.
   * @param dto - Data transfer object containing additional information required
   *              to complete the invite acceptance (e.g., user details, password, role).
   * @returns A promise resolving to the newly created or updated user account
   *          along with their association to the invited store/business.
   */

  async acceptInvite(token: string, dto: { name: string; password: string }) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Decode token → inviteId
        const inviteId = await this.jwtHelper.verifyToken<string>(token); // JWT decode
        const invite = await manager.findOne(Invite, {
          where: { id: inviteId },
        });

        if (!invite) throw new NotFoundException('Invite not found');
        if (invite.expires_at < new Date()) {
          throw new BadRequestException('Invite has expired');
        }

        // 2. Check if user already exists in local DB
        let user = await manager.findOne(User, {
          where: { email: invite.email },
        });

        if (!user) {
          // 2a. Create user in Supabase Auth
          const { data: authUser, error: authError } =
            await this.supabase.auth.admin.createUser({
              email: invite.email,
              password: dto.password,
              email_confirm: true,
              user_metadata: { name: dto.name },
            });

          if (authError) {
            throw new BadRequestException(
              `Supabase Auth error: ${authError.message}`,
            );
          }

          // 2b. Create local user record
          user = manager.create(User, {
            id: authUser.user.id, // use Supabase auth user ID
            email: invite.email,
            name: dto.name,
            status: 'active',
            business_id: invite.business_id,
            store_id: invite.store_id,
          });

          await manager.save(user);
        }

        // 3. Ensure store exists
        const store = await manager.findOne(Store, {
          where: { id: invite.store_id },
        });
        if (!store) throw new NotFoundException('Store not found');

        // 4. Link user to store
        const storeUser = manager.create(StoreUser, {
          id: uuidv4(),
          store_id: invite.store_id,
          business_id: invite.business_id,
          user,
          store,
          role: invite.role,
          status: 'active',
        });

        await manager.save(storeUser);

        // 5. Delete invite
        await manager.remove(invite);

        // 6. Send a successfull invite accepted message
        await this.resend.emails.send({
          from: `${this.config.get<string>('GMAIL_USER')}`,
          to: invite.email,
          subject: `Your invitation to join ${store.name} was accepted`,
          html: `
              <p>Hello ${dto.name},</p>
              <p>Your invitation to join <strong>${store.name}</strong> has been accepted and your account is now active.</p>
              <p>You can now log in and start using the platform.</p>
              <p>If you have any questions, please contact support.</p>
            `,
        });

        return {
          message:
            'Invite accepted, Supabase user created and assigned to store',
          user_id: user.id,
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'acceptInvite');
    }
  }
  /**
   * Finds a store by its ID and applies updates.
   *
   * This method first validates the existence of the store. If the store exists,
   * it updates the record with the provided data transfer object (DTO) fields
   * such as name, description, settings, etc. The updated store entity is then
   * returned.
   *
   * @param {string} storeId - The unique identifier of the store to update.
   * @param {UpdateStoreDto} dto - The data transfer object containing fields
   *   that should be updated (e.g., name, description, address, status).
   *
   * @returns {Promise<Store>} A promise that resolves with the updated store entity.
   *
   * @throws {NotFoundException} If no store with the given ID exists.
   * @throws {BadRequestException} If validation fails or the update could not be applied.
   * @throws {InternalServerErrorException} For unexpected errors during update.
   */

  async updateStore(storeId: string, dto: UpdateStoreDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Preload merges new data into existing entity
        const store = await manager.preload(Store, {
          id: storeId,
          ...dto,
        });

        if (!store) {
          throw new NotFoundException('Cannot find store');
        }

        return await manager.save(Store, store);
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'updateStore');
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
  /**
   * Updates user assignments within a specific store.
   *
   * This method handles bulk user updates in a transactional context to ensure
   * data integrity. Supported actions include:
   *
   * - **remove**: Removes a user from the store. If the user is no longer assigned
   *   to any other store, the user will also be deleted from Supabase Auth.
   * - **assignRole**: Updates the role of a user in the store.
   *
   * @param storeId - The unique identifier of the store where user updates should occur.
   * @param dto - Data transfer object containing a list of user actions, including
   *              user IDs, the action type (`remove` | `assignRole`), and the new role if applicable.
   * @returns A success message confirming the updates.
   *
   * @throws {NotFoundException} If a specified user does not belong to the store.
   * @throws {BadRequestException} If role is missing for an `assignRole` action or
   *                               if Supabase Auth user deletion fails.
   */

  async updateStoreUsers(storeId: string, dto: UpdateStoreUsersDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        for (const userAction of dto.actions) {
          const { userId, action, role } = userAction;

          // check if user belongs to this store
          const storeUser = await manager.findOne(StoreUser, {
            where: { store: { id: storeId }, user: { id: userId } },
            relations: ['user', 'store'],
          });

          if (!storeUser) {
            throw new NotFoundException(`User ${userId} not found in store`);
          }

          if (action === 'remove') {
            // 1. Remove user from this store
            await manager.remove(storeUser);

            // 2. Check if user is still assigned to other stores
            const remainingStores = await manager.count(StoreUser, {
              where: { user: { id: userId } },
            });

            // 3. If no stores left, remove user from Supabase Auth
            if (remainingStores === 0) {
              const { error } =
                await this.supabase.auth.admin.deleteUser(userId);
              if (error) {
                throw new BadRequestException(
                  `Failed to delete user from Supabase: ${error.message}`,
                );
              }
            }
          }

          if (action === 'assignRole') {
            if (!role) {
              throw new BadRequestException(
                'Role is required when assigning role',
              );
            }
            storeUser.role = role;
            storeUser.assigned_at = new Date();
            await manager.save(storeUser);
          }
        }

        return { message: 'Store users updated successfully' };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'updateStoreUsers');
    }
  }

  /**
   * Deletes a store and performs full cleanup of related entities.
   *
   * Workflow:
   * 1. Validates the store exists and loads related store-user mappings.
   * 2. Iterates through all users in the store:
   *    - Removes their `StoreUser` link to the store.
   *    - Checks if the user is linked to other stores.
   *    - If the user has no other store memberships:
   *        a) Removes them from the `users` table.
   *        b) Deletes the user from Supabase Auth.
   * 3. Deletes the store itself once cleanup is complete.
   *
   * @param storeId - The unique identifier of the store to delete.
   *
   * @returns A success object containing:
   * - `message`: A confirmation string.
   * - `deletedStore`: Minimal store details (id and name) of the deleted store.
   *
   * @throws {NotFoundException} If the store with the given ID does not exist.
   * @throws {BadRequestException} If user deletion from Supabase Auth fails.
   * @throws {ServiceUnavailableException} For unexpected errors handled by the error handler.
   *
   * ⚠️ Note:
   * - This operation is wrapped in a single database transaction to ensure atomicity.
   * - If any step fails, the entire transaction is rolled back.
   * - Be cautious when using this in production, as it will *permanently remove* users
   *   who are only assigned to the deleted store.
   */

  async deleteStore(storeId: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 1. Ensure store exists with related users
        const store = await manager.findOne(Store, {
          where: { id: storeId },
          relations: ['storeUsers', 'storeUsers.user'], // load store-users mapping
        });

        if (!store) {
          throw new NotFoundException(`Store with ID ${storeId} not found`);
        }

        // 2. Handle users in this store
        if (store.storeUsers?.length) {
          for (const storeUser of store.storeUsers) {
            const user = storeUser.user;

            // Remove this store-user link
            await manager.remove(storeUser);

            // Check if this user belongs to any other stores
            const otherStores = await manager.count(StoreUser, {
              where: { user: { id: user.id } },
            });

            if (otherStores === 0) {
              // User does not belong to any other store, safe to delete
              await manager.remove(user);

              // Delete from Supabase Auth as well
              const { error } = await this.supabase.auth.admin.deleteUser(
                user.id,
              );
              if (error) {
                throw new BadRequestException(
                  `Failed to delete user ${user.id} from Supabase: ${error.message}`,
                );
              }
            }
          }
        }

        // 3. Delete the store itself
        await manager.remove(Store, store);

        return {
          message: 'Store deleted successfully (users cleaned up too)',
          deletedStore: { id: store.id, name: store.name },
        };
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deleteStore');
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
}
//
