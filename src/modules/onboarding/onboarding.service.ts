import {
    Injectable,
    Inject,
    Logger,
    InternalServerErrorException,
    BadRequestException
} from "@nestjs/common";
import { CreateStoreDto } from "./dto/create-store.dto";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { isValidUUID } from "../../../utils/id-validator";
@Injectable()
export class OnboardingService {
    private logger = new Logger(OnboardingService.name);
    constructor(@Inject("SUPABASE_CLIENT") private readonly supabase: any) {}

    async createStore(createStoreDto: CreateStoreDto, owner_id: string) {
        try {
            // Validate owner_id format
            const isOwnerIdValid = isValidUUID(owner_id);

            if (!isOwnerIdValid) {
                throw new BadRequestException("owner_id format is invalid");
            }
            // Check if store exists and update if want to change a data
            const { data: existsAdminUser, error: existsError } =
                await this.supabase
                    .from("stores")
                    .select("*")
                    .eq("owner_id", owner_id)
                    .maybeSingle();
            if (existsError) {
                throw new BadRequestException(`Error checking store existence:
                ${existsError.message}}`);
            }
            // if exists store update it
            if (existsAdminUser) {
                const { data: store, error: updateError } = await this.supabase
                    .from("stores")
                    .update(createStoreDto)
                    .eq("owner_id", owner_id)
                    .select();
                if (updateError) {
                    throw new BadRequestException(`Error updating store:
                ${updateError.message}}`);
                }

                return { store_id: store[0].id };
            }

            // Create a store if does not exists
            const { data: newStore, error: createError } = await this.supabase
                .from("stores")
                .insert([{ ...createStoreDto, owner_id }])
                .select();

            if (createError) {
                throw new BadRequestException(`Error creating store:
                ${createError.message}`);
            }
            console.log(newStore);
            return { store_id: newStore[0].id };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Oops error while creating store: ${error.message}`
            );
            throw new InternalServerErrorException(
                "An error occured while creating store. Try again later"
            );
        }
    }

    async createAdminUser(createAdminUserDto: CreateAdminUserDto, owner_id) {
        try {            // Validate owner_id format
            const isOwnerIdValid = isValidUUID(owner_id);

            if (!isOwnerIdValid) {
                throw new BadRequestException("owner_id format is invalid");
            }
            
            // Check if admin user exists and update if want to change a data
            const { data: existsAdminUser, error: existsError } =
                await this.supabase
                    .from("users")
                    .select("*")
                    .eq("id", owner_id)
                    .maybeSingle();
            if (existsError) {
                throw new BadRequestException(`Error checking admin user existence:
                ${existsError.message}}`);
            }
            // if admin user exists update it
            if (existsAdminUser) {
                const { error: updateError } = await this.supabase
                    .from("users")
                    .update(createAdminUserDto)
                    .eq("id", owner_id)
                    .select();
                if (updateError) {
                    throw new BadRequestException(`Error updating admin user:
                ${updateError.message}}`);
                }

                return { message: "Updated admin user credentials" };
            }

            // Create a admin user if does not exists
            const { data, error: createError } = await this.supabase
                .from("users")
                .insert([{ ...createAdminUserDto, id: owner_id }])
                .select();

            if (createError) {
                throw new BadRequestException(`Error creating admin user:
                ${createError.message}`);
            }

            return { message: "Successfully created a admin user" };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Oops error while creating admin user: ${error.message}`
            );
            throw new InternalServerErrorException(
                "An error occured while creating admin user. Try again later"
            );
        }
    }
}
