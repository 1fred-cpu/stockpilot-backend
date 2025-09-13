import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { isValidUUID } from '../../utils/id-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: any,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly errorHandler: HandleErrorService,
    private readonly config: ConfigService,
  ) {} /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto) {
    try {
      // 1. Check user exists
      const existingUser = await this.findUser({ email: dto.email });

      if (existingUser)
        throw new ConflictException(
          'There is an exists user with this credentials ',
        );

      // 2. Define user payload
      const payload = {
        id: uuidv4(),
        name: dto.name,
        email: dto.email,
        store_id: null,
        role: 'Admin',
        auth_provider: 'local',
        business_id: null,
        status: 'pending_setup',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // 3. insert user into users table with transaction
      const user = await this.createUserWithTransaction(payload);

      return user;
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createUser');
    }
  }

  async signUpWithGoogle(dto: CreateUserDto) {
    try {
      // 1. Find user by email
      const existingUser = await this.findUser({ email: dto.email });

      if (existingUser) {
        // Case A: User exists already with email/password
        if (existingUser.auth_provider === 'local') {
          // Update to allow Google login as well
          existingUser.auth_provider = 'google'; // or "both"
          existingUser.updated_at = new Date();

          await this.userRepo.save(existingUser);

          const nextStep =
            !existingUser.business_id && !existingUser.store_id
              ? 'register_business'
              : 'dashboard';

          return {
            message: 'Google account linked successfully',
            nextStep,
            user: existingUser,
          };
        }

        // Case B: Already Google user → just log them in
        const nextStep =
          !existingUser.business_id && !existingUser.store_id
            ? 'register_business'
            : 'dashboard';

        return {
          message: 'User signed in with Google successfully',
          nextStep,
          user: existingUser,
        };
      }

      // 2. New Google user → create
      const payload = {
        id: uuidv4(),
        name: dto.name,
        email: dto.email,
        store_id: null,
        role: 'Admin',
        business_id: null,
        status: 'pending_setup',
        auth_provider: 'google', // track provider
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newUser = await this.createUserWithTransaction(payload);

      return {
        message: 'Google account registered successfully',
        nextStep: 'register_business',
        user: newUser,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'signUpWithGoogle');
    }
  }

  /**
   * Find a single user by ID and optional store_id
   */
  async findUser(query: Partial<Record<keyof User, any>>) {
    const user = await this.userRepo.findOne({
      where: query,
    });

    return user || null;
  }

  /**
   *
   * @param userId
   * @returns
   */
  async deleteUser(userId: string) {
    try {
      return await this.deleteUserWithTransaction(userId);
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'deleteUser');
    }
  }

  private async createUserWithTransaction(userData: any) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const data = await manager.create(User, userData);
        const newUser = await manager.save(User, data);
        return newUser;
      });
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process request. Please try again.',
          errorCode: 'TRANSACTION_FAILED',
          details:
            this.config.get<string>('NODE_ENV') === 'development'
              ? error.message
              : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async deleteUserWithTransaction(userId: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(User, { where: { id: userId } });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        await manager.delete(User, { id: userId });

        return { message: 'User deleted successfully', success: true };
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new HttpException(
        {
          message: 'Failed to process request. Please try again.',
          errorCode: 'TRANSACTION_FAILED',
          details:
            this.config.get<string>('NODE_ENV') === 'development'
              ? error.message
              : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a user
   */
}
