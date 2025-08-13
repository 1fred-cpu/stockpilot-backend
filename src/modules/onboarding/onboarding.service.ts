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

    private validateUUID(id: string, fieldName: string) {
        if (!isValidUUID(id)) {
            throw new BadRequestException(`${fieldName} format is invalid`);
        }
    }

    private handleSupabaseError(operation: string, error: any) {
        if (error) {
            throw new BadRequestException(
                `Error ${operation}: ${error.message}`
            );
        }
    }

    async createStore(createStoreDto: CreateStoreDto, ownerId: string) {
        try {
            this.validateUUID(ownerId, "ownerId");

            // Check existing store
            const { data: existingStore, error: existsError } =
                await this.supabase
                    .from("stores")
                    .select("*")
                    .eq("ownerId", ownerId)
                    .maybeSingle();

            this.handleSupabaseError("checking store existence", existsError);

            if (existingStore) {
                // Update existing store
                const { data: updatedStore, error: updateError } =
                    await this.supabase
                        .from("stores")
                        .update(createStoreDto)
                        .eq("ownerId", ownerId)
                        .select();

                this.handleSupabaseError("updating store", updateError);

                return { storeId: updatedStore[0]?.id };
            }

            // Create new store
            const { data: newStore, error: createError } = await this.supabase
                .from("stores")
                .insert([{ ...createStoreDto, ownerId }])
                .select();

            this.handleSupabaseError("creating store", createError);

            return { storeId: newStore[0]?.id };
        } catch (error) {
            this.logger.error(
                `Error in createStore: ${error.message}`,
                error.stack
            );
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(
                "An error occurred while creating store. Try again later."
            );
        }
    }

    async createAdminUser(
        createAdminUserDto: CreateAdminUserDto,
        ownerId: string
    ) {
        try {
            this.validateUUID(ownerId, "ownerId");

            // Check existing admin user
            const { data: existingUser, error: existsError } =
                await this.supabase
                    .from("users")
                    .select("*")
                    .eq("id", ownerId)
                    .maybeSingle();

            this.handleSupabaseError(
                "checking admin user existence",
                existsError
            );

            if (existingUser) {
                // Update existing admin user
                const { error: updateError } = await this.supabase
                    .from("users")
                    .update(createAdminUserDto)
                    .eq("id", ownerId)
                    .select();

                this.handleSupabaseError("updating admin user", updateError);

                return { message: "Updated admin user credentials" };
            }

            // Create new admin user
            const { error: createError } = await this.supabase
                .from("users")
                .insert([{ ...createAdminUserDto, id: ownerId }])
                .select();

            this.handleSupabaseError("creating admin user", createError);

            return { message: "Successfully created an admin user" };
        } catch (error) {
            this.logger.error(
                `Error in createAdminUser: ${error.message}`,
                error.stack
            );
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(
                "An error occurred while creating admin user. Try again later."
            );
        }
    }
}
