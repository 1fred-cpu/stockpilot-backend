import {
    Injectable,
    Inject,
    InternalServerErrorException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger
} from "@nestjs/common";

import { HandleErrorService } from "src/helpers/handle-error.helper";
import { v4 as uuidv4 } from "uuid";
import { CreateStoreDto } from "./dto/create-store.dto";
import { Store } from "./entities/store.entity";
import { KafkaHelper } from "../../helpers/kafka.heper";
import { SupabaseClient } from "@supabase/supabase-js";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { Categories } from "src/entities/category.entity";
import { InviteUserDto } from "./dto/invite-user.dto";
import EventEmitter2 from "eventemitter2";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { MailService } from "src/utils/mail/mail.service";
import { SendInviteDto } from "./dto/send-invite.dto";
import { Invite } from "src/entities/invite.entity";

// @Injectable()
// export class StoresService {
//   private readonly logger = new Logger(StoresService.name);

//   constructor(
//     @Inject('SUPABASE_CLIENT') private readonly supabase: any,
//     private readonly fileUploadService: FileUploadService,
//   ) {}

//   /** -------------------- CREATE STORE -------------------- **/

//   /** -------------------- FIND STORE -------------------- **/
//   async findStore(storeId: string) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data: store, error: fetchError } = await this.supabase
//         .from('stores')
//         .select('*')
//         .eq('id', storeId)
//         .maybeSingle();

//       if (fetchError) {
//         this.logger.error(`Error fetching store: ${fetchError.message}`);
//         throw new InternalServerErrorException('Error fetching store');
//       }

//       if (!store) {
//         throw new NotFoundException('Store not found');
//       }

//       return store;
//     } catch (error) {
//       this.handleServiceError(error, 'findStore');
//     }
//   }
//   /** -------------------- FIND STORE WITH OWNER ID -------------------- **/
//   async findStoreWithOwnerId(ownerId: string) {
//     try {
//       if (!ownerId) {
//         throw new BadRequestException('owner ID is required');
//       }
//       const { data: store, error: fetchError } = await this.supabase
//         .from('stores')
//         .select('*')
//         .eq('ownerId', ownerId)
//         .maybeSingle();

//       if (fetchError) {
//         this.logger.error(`Error fetching store: ${fetchError.message}`);
//         throw new InternalServerErrorException('Error fetching store');
//       }

//       if (!store) {
//         throw new NotFoundException('Store not found');
//       }

//       return store;
//     } catch (error) {
//       this.handleServiceError(error, 'findStore');
//     }
//   }

//   /** -------------------- UPDATE STORE -------------------- **/
//   async updateStore(storeId: string, updateStoreDto: UpdateStoreDto) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data, error: updateError } = await this.supabase
//         .from('stores')
//         .update({
//           ...updateStoreDto,
//           updatedAt: new Date().toISOString(),
//         })
//         .eq('id', storeId)
//         .select();

//       if (updateError) {
//         this.logger.error(`Error updating store: ${updateError.message}`);
//         throw new InternalServerErrorException('Error updating store');
//       }

//       const updatedStore = data[0];
//       if (!updatedStore) {
//         throw new NotFoundException('Store not found');
//       }

//       return {
//         message: 'Store updated successfully',
//         store: updatedStore,
//       };
//     } catch (error) {
//       this.handleServiceError(error, 'updateStore');
//     }
//   }

//   /** -------------------- DELETE STORE -------------------- **/
//   async deleteStore(storeId: string) {
//     try {
//       this.validateUUID(storeId, 'store ID');

//       const { data, error: deleteError } = await this.supabase
//         .from('stores')
//         .delete()
//         .eq('id', storeId)
//         .select();

//       if (deleteError) {
//         this.logger.error(`Error deleting store: ${deleteError.message}`);
//         throw new InternalServerErrorException('Error deleting store');
//       }

//       const deletedStore = data[0];
//       if (!deletedStore) {
//         throw new NotFoundException('Store not found');
//       }

//       return { message: 'Store deleted successfully' };
//     } catch (error) {
//       this.handleServiceError(error, 'deleteStore');
//     }
//   }
//   async findAllStores(query: {
//     limit?: number;
//     page?: number;
//     ownerId?: string;
//     businessType?: string;
//   }) {
//     try {
//       const { limit = 10, page = 1, ownerId, businessType } = query;

//       let supabaseQuery = this.supabase
//         .from('stores')
//         .select('*', { count: 'exact' });

//       // Apply filters if provided
//       if (ownerId) {
//         supabaseQuery = supabaseQuery.eq('ownerId', ownerId);
//       }

//       if (businessType) {
//         supabaseQuery = supabaseQuery.ilike(
//           'businessType',
//           `%${businessType}%`,
//         );
//       }

//       // Apply pagination
//       const from = (page - 1) * limit;
//       const to = from + limit - 1;
//       supabaseQuery = supabaseQuery.range(from, to);

//       const { data, error, count } = await supabaseQuery;

//       if (error) {
//         throw new BadRequestException(
//           `Error fetching stores: ${error.message}`,
//         );
//       }

//       return {
//         stores: data,
//         pagination: {
//           total: count,
//           page,
//           limit,
//           totalPages: Math.ceil(count / limit),
//         },
//       };
//     } catch (error) {
//       if (error instanceof BadRequestException) throw error;
//       throw new InternalServerErrorException(
//         'An error occurred while fetching stores',
//       );
//     }
//   }

//   /** -------------------- HELPER METHODS -------------------- **/
//   private validateUUID(id: string, label: string) {
//     if (!isValidUUID(id)) {
//       throw new BadRequestException(`Invalid format for ${label}`);
//     }
//   }

//   private handleServiceError(error: any, method: string) {
//     if (
//       error instanceof BadRequestException ||
//       error instanceof NotFoundException ||
//       error instanceof ConflictException
//     ) {
//       throw error;
//     }
//     this.logger.error(`Unexpected error in ${method}: ${error.message}`);
//     throw new InternalServerErrorException('An unexpected error occurred');
//   }

//   private async createStore(data: CreateStoreDto): Promise<any> {
//     const { data: store, error: createError } = await this.supabase
//       .from('stores')
//       .insert([data])
//       .select()
//       .maybeSingle();

//     if (createError) {
//       throw new InternalServerErrorException('Error creating store');
//     }

//     return store;
//   }
// }

// store.service.ts

@Injectable()
export class StoresService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
        private readonly errorHandler: HandleErrorService,
        private readonly mailService: MailService
    ) {}

    /* CREATE STORE METHOD */
    async createStore(dto: CreateStoreDto): Promise<Store | undefined> {
        try {
            // Check if store with same name and business_id exists for the business
            if (
                await this.doStoreExists(
                    dto.business_id,
                    dto.store_name,
                    dto.location
                )
            ) {
                throw new ConflictException(
                    "Store with this business ID, name and location already exists"
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
                created_at: new Date().toISOString()
            };

            // Insert into Supabase
            const { error: createError } = await this.supabase
                .from("stores")
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
            this.errorHandler.handleServiceError(error, "createStore");
        }
    }

    /**  FIND A STORE METHOD */
    async findStore(storeId: string): Promise<Store | undefined> {
        try {
            return this.getStore(storeId);
        } catch (error) {
            this.errorHandler.handleServiceError(error, "findStore");
        }
    }

    /** FIND ALL STORES FOR A BUSINESS */
    async findAllStores(businessId: string): Promise<Store[] | undefined> {
        try {
            const { data: stores, error: fetchError } = await this.supabase
                .from("stores")
                .select("*")
                .eq("business_id", businessId);

            if (fetchError) {
                throw new BadRequestException(fetchError.message);
            }

            if (stores.length === 0) {
                return [];
            }

            return stores;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "findAllStores");
        }
    }

    /** FIND STORE AND UPDATE */
    async updateStore(
        storeId: string,
        dto: UpdateStoreDto
    ): Promise<Store | undefined> {
        try {
            // returns a store , throws an error when not found
            await this.getStore(storeId);

            // Update store with the new data
            const { data: updatedStore, error: updateError } =
                await this.supabase
                    .from("stores")
                    .update({ ...dto, updated_at: new Date().toISOString() })
                    .eq("id", storeId)
                    .select()
                    .maybeSingle();

            if (updateError) {
                throw new BadRequestException(updateError.message);
            }

            return updatedStore;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "updateStore");
        }
    }

    /** DELETE STORE METHOD  */
    async deleteStore(storeId: string): Promise<Store | undefined> {
        try {
            // returns a store or throws an error when not found
            await this.getStore(storeId);

            // Delete store
            const { data: deletedStore, error: deleteError } =
                await this.supabase
                    .from("stores")
                    .delete()
                    .eq("id", storeId)
                    .select()
                    .maybeSingle();

            if (deleteError) {
                throw new BadRequestException(deleteError.message);
            }

            return deletedStore;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "deleteStore");
        }
    }

    async getStoreProductsCategories(
        storeId: string
    ): Promise<Categories | undefined> {
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
    /**  SENDS A INVITE EMAIL */
    async sendInvite(dto: SendInviteDto): Promise<Invite | undefined> {
        try {
            // 1. Check if invited user already exists in store
            const { data: existingStoreMember, error: existError } =
                await this.supabase
                    .from("store_users")
                    .select("id")
                    .match({
                        store_id: dto.store_id,
                        email: dto.email
                    })
                    .maybeSingle();
            if (existError) {
                throw new BadRequestException(existError.message);
            }
            if (existingStoreMember) {
                throw new ConflictException(
                    "Can't send an invite to a user who already exists in a store"
                );
            }
            // 2. Check if invite exists
            const { data: existingInvite, error: fetchError } =
                await this.supabase
                    .from("invites")
                    .select("id")
                    .match({
                        store_id: dto.store_id,
                        business_id: dto.business_id,
                        email: dto.email
                    })
                    .maybeSingle();
            if (fetchError) {
                throw new BadRequestException(fetchError.message);
            }
            if (existingInvite) {
                throw new BadRequestException(
                    "Invite for this email already exists"
                );
            }

            // 2. Define invite data
            const inviteData = {
                id: uuidv4(),
                business_id: dto.business_id,
                store_id: dto.store_id,
                role: dto.role,
                invitedBy: dto.invitedBy,
                expires_at: new Date(),
                created_at: new Date().toISOString
            };

            // 3. Insert invite data to database
            const { error: createInviteError } = await this.supabase
                .from("invites")
                .insert(inviteData);
            if (createInviteError) {
                throw new BadRequestException(createInviteError.message);
            }

            // 4. Emit a user.events (UserInviteSend)
            await this.EventEmitterHelper.emitEvent(
                "user.events",
                dto.store_id,
                "UserInviteSend",
                {
                    ...inviteData,
                    store_name: dto.store_name,
                    location: dto.location
                }
            );

            return inviteData;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "sendInvite");
        }
    }

    /** INVITES A USER TO JOIN A STORE */

    async inviteUser(
        storeId: string,
        businessId: string,
        dto: InviteUserDto,
        invitedBy: string
    ) {
        try {
            // 1. Check if user exists
            const { data: existingUser, error: userError } = await this.supabase
                .from("users")
                .select("*")
                .eq("email", dto.email)
                .maybeSingle();

            if (userError) throw new BadRequestException(userError.message);

            let userId: string;

            if (!existingUser) {
                // 2. Create user in Supabase Auth
                const { data: authUser, error: authError } =
                    await this.supabase.auth.admin.createUser({
                        email: dto.email,
                        password: dto.password,
                        email_confirm: false,
                        user_metadata: { name: dto.name }
                    });

                if (authError) throw new BadRequestException(authError.message);

                userId = authUser.user.id;

                // Insert into users table
                const { error: insertError } = await this.supabase
                    .from("users")
                    .insert({
                        id: userId,
                        email: dto.email,
                        name: dto.name,
                        status: "invited",
                        business_id: businessId
                    });

                if (insertError)
                    throw new BadRequestException(insertError.message);
            } else {
                userId = existingUser.id;
            }

            // 3. Assign user to store
            const { error: storeUserError } = await this.supabase
                .from("store_users")
                .insert({
                    store_id: storeId,
                    user_id: userId,
                    role: dto.role,
                    status: "pending",
                    business_id: businessId
                });

            if (storeUserError)
                throw new BadRequestException(storeUserError.message);

            return { message: "User invited successfully", user_id: userId };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "inviteUser");
        }
    }
    /** Helpers method */

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

    // Get a store
    private async getStore(storeId: string): Promise<Store | undefined> {
        const { data: store, error: fetchError } = await this.supabase
            .from("stores")
            .select("*")
            .eq("id", storeId)
            .maybeSingle();
        if (fetchError) {
            throw new BadRequestException(fetchError.message);
        }

        if (!store) {
            throw new NotFoundException("Store not found");
        }
        return store;
    }
}
