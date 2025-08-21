import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
    InternalServerErrorException
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { isValidUUID } from "../../../utils/id-validator";
@Injectable()
export class UsersService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any
    ) {} /**
     * Create a new user
     */
    async createUser(createUserDto: CreateUserDto) {
        try {
            // Validate ID format
            if (!isValidUUID(createUserDto.id)) {
                throw new BadRequestException("Invalid user ID format");
            }

            // Check if user already exists
            const { data: existsUser, error: existsError } = await this.supabase
                .from("users")
                .select("*")
                .eq("id", createUserDto.id)
                .maybeSingle();

            if (existsError) {
                throw new BadRequestException(
                    `Error checking user existence: ${existsError.message}`
                );
            }

            if (existsUser) {
                throw new ConflictException("User already exists");
            }

            // Create a new user
            const { data: newUser, error: createError } = await this.supabase
                .from("users")
                .insert([createUserDto])
                .select()
                .maybeSingle();

            if (createError) {
                throw new BadRequestException(
                    `Error creating user: ${createError.message}`
                );
            }

            return { message: "User created successfully", user: newUser };
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof ConflictException
            ) {
                throw error;
            }
            console.error(error.message);
            throw new InternalServerErrorException(
                "An error occurred while creating user"
            );
        }
    }

    /**
     * Find a single user by ID and optional store_id
     */
    async findUser(userId: string, storeId?: string) {
        try {
            const query = this.supabase
                .from("users")
                .select("*")
                .eq("id", userId);

            if (storeId) {
                query.eq("store_id", storeId);
            }

            const { data: user, error } = await query.maybeSingle();

            if (error) {
                throw new BadRequestException(
                    `Error fetching user: ${error.message}`
                );
            }

            if (!user) {
                throw new NotFoundException("User not found");
            }

            return user;
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            console.error(error.message);
            throw new InternalServerErrorException("Error finding user");
        }
    }

    /**
     * Update a user
     */
    async updateUser(userId: string, updateUserDto: Partial<CreateUserDto>) {
        try {
            // Ensure user exists first
            await this.findUser(userId);

            const { data: updatedUser, error } = await this.supabase
                .from("users")
                .update(updateUserDto)
                .eq("id", userId)
                .select()
                .maybeSingle();

            if (error) {
                throw new BadRequestException(
                    `Error updating user: ${error.message}`
                );
            }

            return { message: "User updated successfully", user: updatedUser };
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            console.error(error.message);
            throw new InternalServerErrorException("Error updating user");
        }
    }

    /**
     * Find all users with optional filtering and pagination
     */
    async findAllUsers(params: {
        storeId?: string;
        page?: number;
        limit?: number;
        search?: string;
    }) {
        try {
            const { storeId, page = 1, limit = 10, search } = params;
            let query = this.supabase
                .from("users")
                .select("*", { count: "exact" });

            if (storeId) {
                query = query.eq("store_id", storeId);
            }

            if (search) {
                query = query.ilike("name", `%${search}%`);
            }

            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            const { data: users, error, count } = await query;

            if (error) {
                throw new BadRequestException(
                    `Error fetching users: ${error.message}`
                );
            }

            return {
                data: users,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error(error.message);
            throw new InternalServerErrorException("Error fetching users");
        }
    }

    /**
     * Delete a user with userId
     */
    async deleteUser(userId: string) {
        try {
            await this.findUser(userId);

            const { error } = await this.supabase
                .from("users")
                .delete()
                .eq("id", userId);

            if (error) {
                throw new BadRequestException(
                    `Error deleting user: ${error.message}`
                );
            }

            return { message: "User deleted successfully" };
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            )
                throw error;
            console.error(error.message);
            throw new InternalServerErrorException("Error deleting user");
        }
    }
}
