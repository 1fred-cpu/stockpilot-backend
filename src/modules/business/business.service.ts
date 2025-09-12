// business.service.ts
import {
    Injectable,
    Inject,
    BadRequestException,
    ConflictException,
    NotFoundException,
    HttpException,
    HttpStatus,
    forwardRef
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { RegisterBusinessDto } from "./dto/register-business.dto";
import { HandleErrorService } from "src/helpers/handle-error.helper";
import { SupabaseClient } from "@supabase/supabase-js";
import { EventEmitterHelper } from "src/helpers/event-emitter.helper";
import { FileUploadService } from "src/utils/upload-file";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Business } from "../../entities/business.entity";
import { BillingService } from "../billing/billing.service";
import { Multer } from "multer";
import { Store } from "src/entities/store.entity";
import { StoreUser } from "src/entities/store-user.entity";
import { User } from "src/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { getPathFromUrl } from "../../utils/get-path";
@Injectable()
export class BusinessService {
    constructor(
        // @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,

        @Inject(forwardRef(() => BillingService))
        private readonly billingService: BillingService,
        @InjectRepository(Business)
        private readonly businessRepo: Repository<Business>,
        private readonly dataSource: DataSource,
        private readonly config: ConfigService,
        private readonly errorHandler: HandleErrorService,
        private readonly fileService: FileUploadService
    ) {}

    async registerBusiness(dto: RegisterBusinessDto, file?: Multer.File) {
        try {
            // 1. Check if business exists
            const existingBusiness = await this.findBusiness({
                name: dto.business_name,
                owner_user_id: dto.owner_user_id
            });

            if (existingBusiness) {
                throw new ConflictException(
                    "A business already exists with this crendentials"
                );
            }

            // 2. Define business payload
            const now = new Date();

            const business = {
                id: uuidv4(),
                name: dto.business_name,
                email: dto.email,
                owner_user_id: dto.owner_user_id,
                phone: dto.phone,
                logo_url: "",
                website: dto.website,
                stripe_customer_id: "",
                created_at: now,
                updated_at: now
            };

            // 3. Define store payload
            const store = {
                id: uuidv4(),
                business_id: business.id,
                name: dto.store_name,
                location: dto.location,
                currency: dto.currency,
                created_at: now,
                updated_at: now
            };

            // 3. Define a store user payload
            const storeUser = {
                id: uuidv4(),
                store_id: store.id,
                user_id: dto.owner_user_id,
                business_id: business.id,
                email: dto.email,
                role: "Admin",
                status: "active",
                assigned_at: now,
                created_at: now,
                updated_at: now
            };

            // 3. Create a stripe customer for business
            const customerStripeId = await this.billingService.createCustomer(
                business.id
            );

            // 4. Upload logo image file to storage
            if (file) {
                const path = `businesses/${dto.business_name}/${uuidv4()}_${
                    file.originalname
                }`;
                business.logo_url = await this.fileService.uploadFile(
                    file,
                    path,
                    "logos"
                );
            }

            // 5.Update the stripe_customer_id in business payload
            business.stripe_customer_id = customerStripeId;

            // 6.Insert business, store and store_user in a transaction DB operations
            const results = await this.createBusinessWithStoreAndUser(
                business,
                store,
                storeUser
            );
            return results;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "registerBusiness");
        }
    }

    async deleteBusiness(businessId: string) {
        try {
            await this.dataSource.transaction(async manager => {
                // Check if business exists
                const business = await manager.findOne(Business, {
                    where: { id: businessId },
                    relations: ["stores", "users", "storeUsers"] // load relations to ensure cascade applies
                });

                if (!business) {
                    throw new NotFoundException("Business not found");
                }

                // Cascade handles deleting related stores, users, and store_users
                await manager.remove(Business, business);

                const prefix = `businesses/${business.name}`;
                
                // Delete all files in the prefix
                await this.fileService.deleteFolder(prefix, "logos");
            });
            return { message: "Business deleted successfully" };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "deleteBusiness");
        }
    }

    /** Helpers */
    /**
     *
     * @param query
     * @returns A business object data
     */
    async findBusiness(query: Partial<Record<keyof Business, any>>) {
        const business = await this.businessRepo.findOne({
            where: query
        });

        if (!business) {
            return null;
        }

        return business;
    }
    async updateBusiness(
        businessId: string,
        updateData: Partial<Business>,
        file?: Multer.File
    ) {
        let newFilePath: string | null = null;

        try {
            // If a new file is included, upload it first
            if (file) {
                const path = `businesses/${businessId}/${uuidv4()}_${
                    file.originalname
                }`;
                const logoUrl = await this.fileService.uploadFile(
                    file,
                    path,
                    "logos"
                );
                updateData.logo_url = logoUrl;
                newFilePath = logoUrl;
            }

            return await this.businessRepo.manager.transaction(
                async manager => {
                    // 1. Fetch business inside transaction
                    const business = await manager.findOne(Business, {
                        where: { id: businessId }
                    });
                    if (!business)
                        throw new NotFoundException("Business not found");

                    // 2. Delete old file (only if new one uploaded)
                    if (file && business.logo_url) {
                        const previousPath = getPathFromUrl(business.logo_url);
                        if (previousPath) {
                            await this.fileService.deleteFile(
                                previousPath,
                                "logos"
                            );
                        }
                    }

                    // 3. Merge update data
                    const updated = manager.merge(
                        Business,
                        business,
                        updateData
                    );

                    // 4. Save update
                    await manager.save(Business, updated);

                    return {
                        message: "Business updated successfully",
                        business: updated
                    };
                }
            );
        } catch (error) {
            // Rollback file upload if DB transaction fails
            if (newFilePath) {
                const rollbackPath = getPathFromUrl(newFilePath);
                await this.fileService.deleteFile(rollbackPath, "logos");
            }

            this.errorHandler.handleServiceError(error, "updateBusiness");
        }
    }

    private async createBusinessWithStoreAndUser(
        businessData: Partial<Business>,
        storeData: Partial<Store>,
        storeUserData: Partial<StoreUser>
    ) {
        try {
            return await this.dataSource.transaction(async manager => {
                // 1. Create + save business
                const business = await manager.create(Business, businessData);
                const newBusiness = await manager.save(Business, business);

                // 2. Create + save store
                const store = await manager.create(Store, storeData);
                const newStore = await manager.save(Store, store);

                // 3. Create + save store_user
                const storeUser = await manager.create(
                    StoreUser,
                    storeUserData
                );
                const newStoreUser = await manager.save(StoreUser, storeUser);

                // 5. update user
                const ownerUser = await manager.preload(User, {
                    id: newBusiness.owner_user_id,
                    store_id: newStore.id,
                    business_id: newBusiness.id,
                    status: "active"
                });
                if (!ownerUser) {
                    throw new NotFoundException("User not found");
                }
                const updatedUser = await manager.save(User, ownerUser);

                return { newBusiness, newStore, newStoreUser, updatedUser };
            });
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new HttpException(
                {
                    success: false,
                    message: "Failed to process request. Please try again.",
                    errorCode: "TRANSACTION_FAILED",
                    details:
                        this.config.get<string>("NODE_ENV") === "development"
                            ? error.message
                            : undefined
                },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
