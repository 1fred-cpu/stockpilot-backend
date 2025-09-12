// auth.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import { StoreUser } from "../../entities/store-user.entity";
import { Store } from "../../entities/store.entity";
import { HandleErrorService } from "../../helpers/handle-error.helper";
@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(StoreUser)
        private readonly storeUserRepo: Repository<StoreUser>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,
        private readonly errorHandler: HandleErrorService
    ) {}

    async getUserWithStores(userId: string) {
        try {
            // 1. Fetch user
            const user = await this.userRepo.findOne({
                where: { id: userId },
                select: [
                    "id",
                    "name",
                    "email",
                    "role",
                    "business_id",
                    "store_id"
                ]
            });

            if (!user) {
                throw new NotFoundException("User not found");
            }

            // 2. Handle setup states
            if (user.role === "Admin" && !user.business_id && !user.store_id) {
                return {
                    status: "PENDING_SETUP",
                    message: "Business setup is required",
                    nextStep: "REGISTER_BUSINESS",
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    stores: [],
                    active_store: null
                };
            }

            if (
                user.role !== "Admin" &&
                (!user.business_id || !user.store_id)
            ) {
                return {
                    status: "PENDING_ASSIGNMENT",
                    message:
                        "You are not yet assigned to any store. Please contact your admin.",
                    nextStep: "WAIT_FOR_ASSIGNMENT",
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    stores: [],
                    active_store: null
                };
            }

            // 3. If user is properly linked → fetch stores
            let stores: any[] = [];

            if (user.role === "Admin") {
                // Admin → all stores under their business
                const allStores = await this.storeRepo.find({
                    where: { business: { id: user.business_id  as string} },
                    relations: ["business"]
                });

                stores = allStores.map(store => ({
                    id: store.id,
                    business_id: store.business_id,
                    name: store.name,
                    business_name: store.business.name,
                    currency: store.currency,
                    location: store.location,
                    is_default: false
                }));
            } else {
                // Normal user → only their stores
                const storeUsers = await this.storeUserRepo.find({
                    where: { user: { id: userId } },
                    relations: ["store", "store.business"]
                });

                stores = storeUsers.map(su => ({
                    id: su.store.id,
                    name: su.store.name,
                    business_name: su.store.business.name,
                    currency: su.store.currency,
                    location: su.store.location,
                    role: su.role,
                    is_default: su.is_default ?? false
                }));
            }

            // 4. Pick active store
            const active_store =
                stores.find(s => s.is_default) || stores[0] || null;

            return {
                status: "ACTIVE",
                message: "Login successful",
                user,
                stores,
                active_store
            };
        } catch (error) {
            this.errorHandler.handleServiceError(error, "getUserWithStores");
        }
    }
}
