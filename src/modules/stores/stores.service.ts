import {
    Injectable,
    Inject,
    InternalServerErrorException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger,
    UnauthorizedException
} from "@nestjs/common";

import { HandleErrorService } from "src/helpers/handle-error.helper";
import { v4 as uuidv4 } from "uuid";
import { UpdateStoreUsersDto } from "./dto/update-store-users.dto";
import { CreateStoreDto } from "./dto/create-store.dto";
import { KafkaHelper } from "../../helpers/kafka.heper";
import { SupabaseClient } from "@supabase/supabase-js";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { InviteUserDto } from "./dto/invite-user.dto";
import EventEmitter2 from "eventemitter2";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { MailService } from "src/utils/mail/mail.service";
import { SendInviteDto } from "./dto/send-invite.dto";
import { generateExpiry } from "src/utils/expiry";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "src/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Store } from "src/entities/store.entity";
import { Repository, DataSource } from "typeorm";
import { Business } from "src/entities/business.entity";
import { SaleItem } from "src/entities/sale-item.entity";
import { Product } from "src/entities/product.entity";
import { StoreInventory } from "src/entities/store-inventory.entity";
import { StoreUser } from "src/entities/store-user.entity";
import * as bcrypt from "bcrypt";
import { Resend } from "resend";
import { Invite } from "../../entities/invite.entity";

@Injectable()
export class StoresService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
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
        private readonly dataSource: DataSource
    ) {}

    /* CREATE STORE METHOD */
    /**
     *
     * @param dto
     * @returns a created store data
     */
    async createStore(dto: CreateStoreDto) {
        try {
            return await this.dataSource.transaction(async manager => {
                // Check if store with same name and business_id exists for the business
                const existingStore = await this.storeRepo.findOne({
                    where: {
                        name: dto.store_name,
                        business_id: dto.business_id
                    }
                });
                if (existingStore) {
                    throw new ConflictException(
                        "Store with this business ID and name already exists"
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
                    updated_at: new Date().toISOString()
                });

                const newStore = await manager.save(Store, storeData);

                // Fetch owner details
                const owner = await this.userRepo.findOne({
                    where: { id: dto.owner_id }
                });

                // Assigned store owner in new store
                const storeOwnerAssigned = manager.create(StoreUser, {
                    id: uuidv4(),
                    store_id: newStore.id,
                    user_id: dto.owner_id,
                    business_id: dto.business_id,
                    email: owner?.email,
                    role: "Owner",
                    status: "active",
                    assigned_at: new Date()
                });

                await manager.save(StoreUser, storeOwnerAssigned);

                return newStore;
            });
        } catch (error) {
            this.errorHandler.handleServiceError(error, "createStore");
        }
    }

    /**  FIND A STORE METHOD */
    async findStore(storeId: string) {
        try {
            const store = await this.storeRepo.findOne({
                where: { id: storeId },
                relations: ["storeUsers", "storeUsers.user"]
            });
            if (!store) {
                throw new NotFoundException("Cannot find store");
            }
            return {
                ...store,
                storeUsers: store.storeUsers.map(u => ({
                    id: u.user.id,
                    name: u.user.name,
                    email: u.user.email,
                    role: u.role,
                    status: u.status
                }))
            };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "findStore");
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
                where: { id: businessId }
            });

            if (!existingBusiness) {
                throw new NotFoundException(
                    "Business with this ID does not exist"
                );
            }

            // 2. Fetch stores with relations
            const stores = await this.storeRepo.find({
                where: { business_id: businessId },
                relations: ["storeUsers", "storeUsers.user"] // include users (with role info)
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
                stores.map(async store => {
                    // ---- Get today's sales ----
                    const salesData = await this.saleItemRepo
                        .createQueryBuilder("saleItem")
                        .select("SUM(saleItem.total_price)", "totalRevenue")
                        .addSelect("SUM(saleItem.quantity)", "totalQuantity")
                        .where("saleItem.store_id = :storeId", {
                            storeId: store.id
                        })
                        .andWhere(
                            "saleItem.created_at BETWEEN :start AND :end",
                            {
                                start: startOfDay,
                                end: endOfDay
                            }
                        )
                        .getRawOne<{
                            totalRevenue: string;
                            totalQuantity: string;
                        }>();

                    // ---- Get total products count (per store) ----
                    const totalProducts = await this.productRepo.count({
                        where: { store_id: store.id }
                    });

                    // ---- Get low stock products count (from store_inventory) ----
                    const lowStockProducts = await this.storeInventoryRepo
                        .createQueryBuilder("inventory")
                        .where("inventory.store_id = :storeId", {
                            storeId: store.id
                        })
                        .andWhere("inventory.quantity < :threshold", {
                            threshold: 5
                        }) // threshold configurable
                        .getCount();

                    return {
                        ...store,
                        todays_sales: {
                            revenue: Number(salesData?.totalRevenue || 0),
                            quantity: Number(salesData?.totalQuantity || 0)
                        },
                        stock: {
                            total_products: totalProducts,
                            low_stock_count: lowStockProducts
                        },
                        managers: store.storeUsers
                            .filter(user => user.role === "Owner" || "Admin")
                            .map(manager => ({
                                id: manager.id,
                                name: manager.user.name,
                                email: manager.email
                            }))
                    };
                })
            );

            return results;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "findAllStores");
        }
    }

    async sendInvite(storeId: string, dto: InviteUserDto) {
        return await this.dataSource.transaction(async manager => {
            // 1. Ensure store exists
            const store = await manager.findOne(Store, {
                where: { id: storeId }
            });
            if (!store)
                throw new NotFoundException(`Store ${storeId} not found`);

            // 2. Check if user already in store
            const existingUser = await manager.findOne(User, {
                where: { email: dto.email }
            });
            if (existingUser) {
                const existsInStore = await manager.findOne(StoreUser, {
                    where: {
                        user: { id: existingUser.id },
                        store: { id: storeId }
                    }
                });
                if (existsInStore) {
                    throw new ConflictException("User already exists in store");
                }
            }

            // 3. Create invite record with expiry
            const invite = manager.create(Invite, {
                email: dto.email,
                business_id: dto.business_id,
                store_id: storeId,
                role: dto.role ?? "member",
                invited_by: dto.invited_by,
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h expiry
            });
            await manager.save(invite);

            // 4. Generate invite token
            const inviteToken = this.generateInviteToken(invite.id); // e.g., JWT with invite.id

            const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

            // 5. Send email via Resend
            await this.resend.emails.send({
                from: process.env.EMAIL_FROM ?? "Acme <noreply@yourdomain.com>",
                to: dto.email,
                subject: `You're invited to join ${store.store_name}`,
                html: `
        <p>Hello,</p>
        <p>You were invited to join <strong>${store.store_name}</strong>.</p>
        <p>Click below to accept the invite:</p>
        <p><a href="${inviteUrl}">Accept Invite</a></p>
        <p>This link will expire in 48 hours.</p>
      `
            });

            return {
                message: "Invite sent successfully",
                invite_id: invite.id,
                email: invite.email,
                expires_at: invite.expires_at
            };
        });
    }
async acceptInvite(token: string, dto: { name: string; password: string }) {
  return await this.dataSource.transaction(async manager => {
    // 1. Decode token → inviteId
    const inviteId = this.verifyInviteToken(token); // JWT decode
    const invite = await manager.findOne(Invite, { where: { id: inviteId } });

    if (!invite) throw new NotFoundException("Invite not found");
    if (invite.expires_at < new Date()) {
      throw new BadRequestException("Invite has expired");
    }

    // 2. Check if user already exists in local DB
    let user = await manager.findOne(User, { where: { email: invite.email } });

    if (!user) {
      // 2a. Create user in Supabase Auth
      const { data: authUser, error: authError } =
        await this.supabase.auth.admin.createUser({
          email: invite.email,
          password: dto.password,
          email_confirm: true,
          user_metadata: { name: dto.name }
        });

      if (authError) {
        throw new BadRequestException(
          `Supabase Auth error: ${authError.message}`
        );
      }

      // 2b. Create local user record
      user = manager.create(User, {
        id: authUser.user.id, // use Supabase auth user ID
        email: invite.email,
        name: dto.name,
        status: "active",
        business_id: invite.business_id
      });

      await manager.save(user);
    }

    // 3. Ensure store exists
    const store = await manager.findOne(Store, { where: { id: invite.store_id } });
    if (!store) throw new NotFoundException("Store not found");

    // 4. Link user to store
    const storeUser = manager.create(StoreUser, {
      id: uuidv4(),
      user,
      store,
      role: invite.role,
      status: "active"
    });

    await manager.save(storeUser);

    // 5. Delete invite
    await manager.remove(invite);

    // 6. Emit event
    this.eventEmitterHelper.emitEvent(
      "user.events",
      invite.business_id,
      "UserAssignedRole",
      {
        business_id: invite.business_id,
        store_id: invite.store_id,
        user_id: user.id,
        email: user.email,
        role: invite.role,
        status: "active"
      }
    );

    return {
      message: "Invite accepted, Supabase user created and assigned to store",
      user_id: user.id
    };
  });
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
            return await this.dataSource.transaction(async manager => {
                // Preload merges new data into existing entity
                const store = await manager.preload(Store, {
                    id: storeId,
                    ...dto
                });

                if (!store) {
                    throw new NotFoundException("Cannot find store");
                }

                return await manager.save(Store, store);
            });
        } catch (error) {
            this.errorHandler.handleServiceError(error, "updateStore");
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
                .from("categories")
                .select("name")
                .eq("storeId", storeId);

            if (error) {
                throw new BadRequestException(error.message);
            }

            if (!data || data.length === 0) {
                return [];
            }

            return data.map(category => category.name);
        } catch (error) {
            this.errorHandler.handleServiceError(
                error,
                "getStoreProductsCategories"
            );
        }
    }
    /**
     * INVITES A USER TO JOIN A STORE
     *
     * - Verify invite exists
     * - Ensure user is not already in the store
     * - Create (or reuse) a user record with status "invited"
     * - Create StoreUser linking user to store with role
     * - Delete invite entry
     * - Send invite email via Resend (with compensation if email fails)
     */
    async inviteUser(storeId: string, dto: InviteUserDto) {
        try {
            // 1) Transaction: validate invite, create user/store link, delete invite
            const txResult = await this.dataSource.transaction(
                async manager => {
                    // 1a. Validate invite exists
                    const invite = await manager.findOne(Invite, {
                        where: {
                            id: dto.invite_id,
                            email: dto.email,
                            business_id: dto.business_id
                        }
                    });

                    if (!invite) {
                        throw new UnauthorizedException(
                            "There is no invite for this email"
                        );
                    }

                    // 1b. Ensure the referenced store exists
                    const store = await manager.findOne(Store, {
                        where: { id: storeId }
                    });
                    if (!store) {
                        throw new NotFoundException(
                            `Store with id ${storeId} not found`
                        );
                    }

                    // 1c. Check if user already exists (globally)
                    let user = await manager.findOne(User, {
                        where: { email: dto.email }
                    });

                    // 1d. If user exists, check whether they're already assigned to this store
                    if (user) {
                        const existingStoreUser = await manager.findOne(
                            StoreUser,
                            {
                                where: {
                                    user: { id: user.id },
                                    store: { id: storeId }
                                }
                            }
                        );

                        if (existingStoreUser) {
                            throw new ConflictException(
                                "Invited user with this email already exists in store"
                            );
                        }

                        // If user exists but not in store, create the StoreUser link below.
                    } else {
                        // 1e. Create a new user (hash the provided password)
                        const userId = uuidv4();
                        const hashedPassword = await bcrypt.hash(
                            dto.password,
                            10
                        );

                        user = manager.create(User, {
                            id: userId,
                            email: dto.email,
                            name: dto.name,
                            status: "invited", // as per your earlier flow
                            business_id: dto.business_id,
                            password: hashedPassword // if you store passwords locally
                            // add other fields your User entity needs
                        });

                        await manager.save(User, user);
                    }

                    // 1f. Create StoreUser link (assign role)
                    const storeUser = manager.create(StoreUser, {
                        id: uuidv4(),
                        user: user,
                        store: store,
                        role: dto.role ?? "member",
                        status: "active"
                        // any other fields
                    });

                    await manager.save(StoreUser, storeUser);

                    // 1g. Delete invite record
                    await manager.remove(invite);

                    // return values needed after transaction (for email)
                    return {
                        userId: user.id,
                        userEmail: user.email,
                        userName: user.name,
                        role: storeUser.role,
                        businessId: dto.business_id,
                        storeId
                    };
                }
            ); // end transaction

            // 2) Emit event for a committed user assignment
            try {
                this.eventEmitterHelper.emitEvent(
                    "user.events",
                    txResult.businessId,
                    "UserAssignedRole",
                    {
                        business_id: txResult.businessId,
                        store_id: txResult.storeId,
                        user_id: txResult.userId,
                        email: txResult.userEmail,
                        role: txResult.role,
                        status: "active"
                    }
                );
            } catch (emitErr) {
                // log but do not fail invitation if event emission fails
                console.error(
                    "Failed to emit event UserAssignedRole:",
                    emitErr
                );
            }

            // 3) Send invite email via Resend
            // Build an invite link (adjust host/path to your app)
            const inviteToken = this.generateInviteToken(
                txResult.userId,
                txResult.storeId
            ); // implement as needed
            const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

            try {
                await this.resend.emails.send({
                    from:
                        process.env.EMAIL_FROM ??
                        "Acme <noreply@yourdomain.com>",
                    to: txResult.userEmail,
                    subject: `You're invited to join ${txResult.businessId} / ${txResult.storeId}`,
                    html: `
            <p>Hi ${txResult.userName ?? ""},</p>
            <p>You were invited to join the store. Click the link below to accept the invite and complete your account setup:</p>
            <p><a href="${inviteUrl}">Accept Invite</a></p>
            <p>If you were not expecting this, ignore this email.</p>
          `
                });
            } catch (emailErr) {
                // If email fails, attempt compensation: remove created store link and possibly user (if we created the user)
                try {
                    await this.dataSource.transaction(async manager => {
                        // remove StoreUser for this user & store
                        await manager.delete(StoreUser, {
                            user: { id: txResult.userId },
                            store: { id: txResult.storeId }
                        });

                        // If the user has no other store links, you might want to delete the user entirely.
                        const remainingLinks = await manager.count(StoreUser, {
                            where: { user: { id: txResult.userId } }
                        });
                        if (remainingLinks === 0) {
                            // optional: only delete users that have status 'invited' to avoid deleting real users
                            await manager.delete(User, {
                                id: txResult.userId,
                                status: "invited"
                            });
                        }
                    });
                } catch (compErr) {
                    console.error(
                        "Compensation transaction failed after email error:",
                        compErr
                    );
                }

                // Bubble up an error to the caller
                throw new BadRequestException(
                    `Failed to send invite email: ${
                        emailErr?.message ?? emailErr
                    }`
                );
            }

            // 4) Success
            return {
                message: "User invited successfully",
                user_id: txResult.userId
            };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "inviteUser");
        }
    }

    async getUserFromStore(storeId: string, userId: string) {
        try {
            const { data, error } = await this.supabase
                .from("store_users")
                .select(
                    `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `
                )
                .eq("store_id", storeId)
                .eq("user_id", userId)
                .maybeSingle();

            if (error) {
                throw new BadRequestException(error.message);
            }

            if (!data) {
                throw new NotFoundException("User not found in this store");
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
                    email: userProfile?.email ?? null
                }
            };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "getUserFromStore");
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
                .from("store_users")
                .select(
                    `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `
                )
                .eq("store_id", storeId);

            if (error) {
                throw new BadRequestException(error.message);
            }

            if (!data || data.length === 0) {
                return [];
            }

            return data.map((row: any) => {
                // Handle `users` as object or array
                const userProfile = Array.isArray(row.users)
                    ? row.users[0]
                    : row.users;

                return {
                    id: row.id,
                    store_id: row.store_id,
                    user_id: row.user_id,
                    role: row.role,
                    status: row.status,
                    business_id: row.business_id,
                    user: {
                        name: userProfile?.name ?? null,
                        email: userProfile?.email ?? null
                    }
                };
            });
        } catch (error) {
            this.errorHandler.handleServiceError(
                error,
                "findAllUsersFromStore"
            );
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
                .from("store_users")
                .select(
                    `
        id,
        store_id,
        user_id,
        role,
        status,
        business_id,
        users(name, email)
      `
                )
                .eq("business_id", businessId);

            if (error) {
                throw new BadRequestException(error.message);
            }

            if (!data || data.length === 0) {
                return [];
            }

            return data.map((row: any) => {
                // Handle `users` as object or array
                const userProfile = Array.isArray(row.users)
                    ? row.users[0]
                    : row.users;

                return {
                    id: row.id,
                    store_id: row.store_id,
                    user_id: row.user_id,
                    role: row.role,
                    status: row.status,
                    business_id: row.business_id,
                    user: {
                        name: userProfile?.name ?? null,
                        email: userProfile?.email ?? null
                    }
                };
            });
        } catch (error) {
            this.errorHandler.handleServiceError(
                error,
                "findAllUsersFromBusiness"
            );
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
        userId: string
    ): Promise<{ message: string } | undefined> {
        try {
            // Prevent business owner from deleting
            const { data: owner, error: ownerError } = await this.supabase
                .from("businesses")
                .select("id")
                .eq("owner_user_id", userId)
                .eq("id", businessId)
                .maybeSingle();

            if (ownerError) {
                throw new UnauthorizedException(ownerError.message);
            }
            if (owner) {
                return { message: "Business owner can't be removed" };
            }
            // 1. Check if user exists in this business
            const { data: existingUser, error: userError } = await this.supabase
                .from("users")
                .select("id, email")
                .eq("id", userId)
                .eq("business_id", businessId)
                .maybeSingle();

            if (userError) {
                throw new BadRequestException(userError.message);
            }

            if (!existingUser) {
                throw new NotFoundException("User not found in this business");
            }

            // 2. Emit a event UserDeleted
            await this.eventEmitterHelper.emitEvent(
                "user.events",
                businessId,
                "UserDeleted",
                {
                    business_id: businessId,
                    user_id: userId
                }
            );

            return { message: `User ${existingUser.email} removed completely` };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "removeUserCompletely");
        }
    }
    async updateStoreUsers(storeId: string, dto: UpdateStoreUsersDto) {
        try {
            return await this.dataSource.transaction(async manager => {
                for (const userAction of dto.actions) {
                    const { userId, action, role } = userAction;

                    // check if user belongs to this store
                    const storeUser = await manager.findOne(StoreUser, {
                        where: { store: { id: storeId }, user: { id: userId } },
                        relations: ["user", "store"]
                    });

                    if (!storeUser) {
                        throw new NotFoundException(
                            `User ${userId} not found in store`
                        );
                    }

                    if (action === "remove") {
                        // 1. Remove user from this store
                        await manager.remove(storeUser);

                        // 2. Check if user is still assigned to other stores
                        const remainingStores = await manager.count(StoreUser, {
                            where: { user: { id: userId } }
                        });

                        // 3. If no stores left, remove user from Supabase Auth
                        if (remainingStores === 0) {
                            const { error } =
                                await this.supabase.auth.admin.deleteUser(
                                    userId
                                );
                            if (error) {
                                throw new BadRequestException(
                                    `Failed to delete user from Supabase: ${error.message}`
                                );
                            }
                        }
                    }

                    if (action === "assignRole") {
                        if (!role) {
                            throw new BadRequestException(
                                "Role is required when assigning role"
                            );
                        }
                        storeUser.role = role;
                        storeUser.assigned_at = new Date();
                        await manager.save(storeUser);
                    }
                }

                return { message: "Store users updated successfully" };
            });
        } catch (error) {
            this.errorHandler.handleServiceError(error, "updateStoreUsers");
        }
    }
    async deleteStore(storeId: string) {
        try {
            return await this.dataSource.transaction(async manager => {
                // 1. Ensure store exists
                const store = await manager.findOne(Store, {
                    where: { id: storeId },
                    relations: ["users", "products"] // include relations if you want to handle them manually
                });

                if (!store) {
                    throw new NotFoundException(
                        `Store with ID ${storeId} not found`
                    );
                }

                // 2. If no cascade configured, manually remove related entities
                // Example: remove users and products before deleting the store
                // if (store.users?.length) {
                //   await manager.remove(store.users);
                // }
                // if (store.products?.length) {
                //   await manager.remove(store.products);
                // }

                // 3. Delete the store
                await manager.remove(Store, store);

                return {
                    message: "Store deleted successfully",
                    deletedStore: { id: store.id, name: store.name }
                };
            });
        } catch (error) {
            this.errorHandler.handleServiceError(error, "deleteStore");
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
        dto: UpdateUserDto
    ): Promise<{ message: string }> {
        try {
            //  Check if user exists
            if (dto.old_email && dto.new_email) {
                const { data: existingUser, error: existsError } =
                    await this.supabase
                        .from("users")
                        .select("id")
                        .eq("email", dto.old_email)
                        .maybeSingle();

                if (existsError) {
                    throw new BadRequestException(existsError.message);
                }
                if (!existingUser) {
                    throw new NotFoundException(
                        "Can't find a user with this email"
                    );
                }

                // Prevent duplicate of emails when updating
                const { data: existingEmail, error: fetchError } =
                    await this.supabase
                        .from("users")
                        .select("id")
                        .eq("email", dto.new_email)
                        .maybeSingle();

                if (fetchError) {
                    throw new BadRequestException(fetchError.message);
                }
                if (existingEmail) {
                    throw new ConflictException(
                        "The new email provided already in use"
                    );
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
                    await this.supabase.auth.admin.updateUserById(
                        userId,
                        authPayload
                    );

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
                    .from("users")
                    .update(userUpdateData)
                    .eq("id", userId)
                    .eq("business_id", businessId);

                if (usersError)
                    throw new BadRequestException(usersError.message);
            }

            // 3. Update store_users table (role, status, email if you store it here)
            const storeUserUpdateData: any = {};
            if (dto.new_email) storeUserUpdateData.email = dto.new_email; // only if stored

            if (Object.keys(storeUserUpdateData).length > 0) {
                const { error: storeUsersError } = await this.supabase
                    .from("store_users")
                    .update(storeUserUpdateData)
                    .eq("user_id", userId)
                    .eq("business_id", businessId);

                if (storeUsersError) {
                    throw new BadRequestException(storeUsersError.message);
                }
            }

            return { message: "User updated successfully" };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "updateUser");
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
        email: string
    ): Promise<boolean> {
        const { data: existingStoreMember, error: fetchError } =
            await this.supabase
                .from("store_users")
                .select("id")
                .match({
                    store_id: storeId,
                    email
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
        location
    ): Promise<boolean> {
        const { data: existsStore, error: existsError } = await this.supabase
            .from("stores")
            .select("id")
            .match({ business_id, name, location })
            .maybeSingle();

        if (existsError) {
            throw new BadRequestException("Error checking store existence");
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
            .from("stores")
            .select("*")
            .eq("id", storeId)
            .maybeSingle();
        if (fetchError) {
            throw new BadRequestException(fetchError.message);
        }

        if (!store) {
            return undefined;
        }
        return store;
    }
    // Example helper to create a short-lived invite token (JWT or whatever you use)
    private generateInviteToken(userId: string, storeId: string) {
        // Implement using JWT or other secure token generator. Example pseudocode:
        // return jwt.sign({ sub: userId, store: storeId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // For this template, we'll return a uuid (NOT recommended for production).
        return uuidv4();
    }
}
//
