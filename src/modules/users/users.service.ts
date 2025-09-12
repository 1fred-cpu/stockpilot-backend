import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
    HttpException,
    HttpStatus,
    InternalServerErrorException
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { isValidUUID } from "../../utils/id-validator";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { User } from "../../entities/user.entity";
import { HandleErrorService } from "../../helpers/handle-error.helper";
import { v4 as uuidv4 } from "uuid";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UsersService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly errorHandler: HandleErrorService,
        private readonly config: ConfigService
    ) {} /**
     * Create a new user
     */
    // async createUser(createUserDto: CreateUserDto) {
    //     try {
    //       // Validate ID format
    //       if (!isValidUUID(createUserDto.id)) {
    //         throw new BadRequestException('Invalid user ID format');
    //       }
    //
    //       // Check if user already exists
    //       const { data: existsUser, error: existsError } = await this.supabase
    //         .from('users')
    //         .select('*')
    //         .eq('id', createUserDto.id)
    //         .maybeSingle();
    //
    //       if (existsError) {
    //         throw new BadRequestException(
    //           `Error checking user existence: ${existsError.message}`,
    //         );
    //       }
    //
    //       if (existsUser) {
    //         throw new ConflictException('User already exists');
    //       }
    //
    //       // Create a new user
    //       const { data: newUser, error: createError } = await this.supabase
    //         .from('users')
    //         .insert([createUserDto])
    //         .select()
    //         .maybeSingle();
    //
    //       if (createError) {
    //         throw new BadRequestException(
    //           `Error creating user: ${createError.message}`,
    //         );
    //       }
    //
    //       return { message: 'User created successfully', user: newUser };
    //     } catch (error) {
    //       if (
    //         error instanceof BadRequestException ||
    //         error instanceof ConflictException
    //       ) {
    //         throw error;
    //       }
    //       console.error(error.message);
    //       throw new InternalServerErrorException(
    //         'An error occurred while creating user',
    //       );
    //     }
    //   }

    async createUser(dto: CreateUserDto) {
        try {
            // 1. Check user exists
            const existingUser = await this.findUser({ email: dto.email });

            if (existingUser)
                throw new ConflictException(
                    "There is an exists user with this credentials "
                );

            // 2. Define user payload
            const payload = {
                id: uuidv4(),
                name: dto.name,
                email: dto.email,
                store_id: null,
                role: "Admin",
                business_id: null,
                status: "pending_setup",
                created_at: new Date(),
                updated_at: new Date()
            };

            // 3. insert user into users table with transaction
            const user = await this.createUserWithTransaction(payload);

            return user;
        } catch (error) {
            this.errorHandler.handleServiceError(error, "createUser");
        }
    }
    /**
     * Find a single user by ID and optional store_id
     */
    async findUser(query: Partial<Record<keyof User, any>>) {
        const user = await this.userRepo.findOne({
            where: query
        });

        return user || null;
    }

    private async createUserWithTransaction(userData: any) {
        try {
            return await this.dataSource.transaction(async manager => {
                const data = await manager.create(User, userData);
                const newUser = await manager.save(User, data);
                return newUser;
            });
        } catch (error) {
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

    /**
     * Update a user
     */
    // async updateUser(userId: string, updateUserDto: Partial<CreateUserDto>) {
    //     try {
    //         // Ensure user exists first
    //         await this.findUser(userId);

    //         const { data: updatedUser, error } = await this.supabase
    //             .from("users")
    //             .update(updateUserDto)
    //             .eq("id", userId)
    //             .select()
    //             .maybeSingle();

    //         if (error) {
    //             throw new BadRequestException(
    //                 `Error updating user: ${error.message}`
    //             );
    //         }

    //         return { message: "User updated successfully", user: updatedUser };
    //     } catch (error) {
    //         if (
    //             error instanceof BadRequestException ||
    //             error instanceof NotFoundException
    //         ) {
    //             throw error;
    //         }
    //         console.error(error.message);
    //         throw new InternalServerErrorException("Error updating user");
    //     }
    // }

    /**
     * Find all users with optional filtering and pagination
     */
    // async findAllUsers(params: {
    //     storeId?: string;
    //     page?: number;
    //     limit?: number;
    //     search?: string;
    // }) {
    //     try {
    //         const { storeId, page = 1, limit = 10, search } = params;
    //         let query = this.supabase
    //             .from("users")
    //             .select("*", { count: "exact" });

    //         if (storeId) {
    //             query = query.eq("store_id", storeId);
    //         }

    //         if (search) {
    //             query = query.ilike("name", `%${search}%`);
    //         }

    //         const offset = (page - 1) * limit;
    //         query = query.range(offset, offset + limit - 1);

    //         const { data: users, error, count } = await query;

    //         if (error) {
    //             throw new BadRequestException(
    //                 `Error fetching users: ${error.message}`
    //             );
    //         }

    //         return {
    //             data: users,
    //             total: count,
    //             page,
    //             limit,
    //             totalPages: Math.ceil(count / limit)
    //         };
    //     } catch (error) {
    //         if (error instanceof BadRequestException) {
    //             throw error;
    //         }
    //         console.error(error.message);
    //         throw new InternalServerErrorException("Error fetching users");
    //     }
    // }

    /**
     * Delete a user with userId
     */
    // async deleteUser(userId: string) {
    //     try {
    //         await this.findUser(userId);

    //         const { error } = await this.supabase
    //             .from("users")
    //             .delete()
    //             .eq("id", userId);

    //         if (error) {
    //             throw new BadRequestException(
    //                 `Error deleting user: ${error.message}`
    //             );
    //         }

    //         return { message: "User deleted successfully" };
    //     } catch (error) {
    //         if (
    //             error instanceof BadRequestException ||
    //             error instanceof NotFoundException
    //         )
    //             throw error;
    //         console.error(error.message);
    //         throw new InternalServerErrorException("Error deleting user");
    //     }
    // }
}
