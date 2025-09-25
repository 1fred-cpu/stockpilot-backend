// auth.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { StoreUser } from '../../entities/store-user.entity';
import { Store } from '../../entities/store.entity';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(StoreUser)
    private readonly storeUserRepo: Repository<StoreUser>,

    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly errorHandler: HandleErrorService,
    private readonly usersService: UsersService,
  ) {}

  async getUserWithStores(email: string) {
    try {
      // 1. Fetch user
      const user = await this.userRepo.findOne({
        where: { email },
        select: ['id', 'name', 'email', 'business_id'],
        relations: ['storeUsers'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 2. Handle setup states
      if (
        user.storeUsers[0]?.role === 'owner' &&
        !user.business_id &&
        !user.storeUsers[0].store_id
      ) {
        return {
          status: 'PENDING_SETUP',
          message: 'Business setup is required',
          nextStep: 'REGISTER_BUSINESS',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.storeUsers[0]?.role,
          },
          stores: [],
          activeStore: null,
        };
      }

      if (
        user.storeUsers[0]?.role !== 'owner' &&
        (!user.business_id || !user.storeUsers[0].store_id)
      ) {
        return {
          status: 'PENDING_ASSIGNMENT',
          message:
            'You are not yet assigned to any store. Please contact your owner.',
          nextStep: 'WAIT_FOR_ASSIGNMENT',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.storeUsers[0]?.role,
          },
          stores: [],
          activeStore: null,
        };
      }

      // 3. If user is properly linked → fetch stores
      let stores: any[] = [];

      if (user.storeUsers[0]?.role === 'owner') {
        // Owner → all stores under their business
        const allStores = await this.storeRepo.find({
          where: { business: { id: user.business_id as string } },
          relations: ['business'],
        });

        stores = allStores.map((store) => ({
          storeId: store.id,
          businessId: store.business_id,
          storeName: store.name,
          businessName: store.business.name,
          currency: store.currency,
          location: store.location,
          address: store.address,
          isdefault: false,
        }));
      } else {
        // Normal user → only their stores
        const storeUsers = await this.storeUserRepo.find({
          where: { user: { email } },
          relations: ['store', 'store.business'],
        });

        stores = storeUsers.map((su) => ({
          storeId: su.store.id,
          storeName: su.store.name,
          businessId: su.business_id,
          businessName: su.store.business.name,
          currency: su.store.currency,
          location: su.store.location,
          address: su.store.address,
          role: su.role,
          isDefault: su.is_default ?? false,
        }));
      }

      // 4. Pick active store
      const activeStore = stores.find((s) => s.isDefault) || stores[0] || null;

      return {
        status: 'ACTIVE',
        message: 'Login successful',
        user: { ...user, role: user.storeUsers?.[0]?.role },
        stores,
        activeStore,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'getUserWithStores');
    }
  }

  async signupUser(dto: { email: string; name: string; userId: string }) {
    try {
      const user = await this.usersService.createUser(dto);
      return {
        message: 'Account registered successfully',
        nextStep: 'REGISTER_BUSINESS',
        user: { ...user, role: 'owner' },
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'signupWithEmailAndPassword');
    }
  }
  async signUpOrInWithGoogle(dto: { name: string; email: string }) {
    try {
      // 1. Find user by email
      const existingUser = await this.usersService.findUser({
        email: dto.email,
      });
      console.log(existingUser);
      if (existingUser) {
        // Case A: User exists already with email/password
        if (existingUser.auth_provider === 'local') {
          // Update to allow Google login as well
          existingUser.auth_provider = 'google'; // or "both"
          existingUser.updated_at = new Date();

          await this.userRepo.save(existingUser);

          // ✅ If user already has business + store → fetch enriched data
          if (
            existingUser.business_id &&
            existingUser.storeUsers?.[0]?.store_id
          ) {
            const data = await this.getUserWithStores(existingUser.email);
            return {
              nextStep: 'COMPLETED',
              data,
            };
          }

          const nextStep =
            !existingUser.business_id && !existingUser.storeUsers[0].store_id
              ? 'REGISTER_BUSINESS'
              : 'dashboard';

          return {
            message: 'Google account linked successfully',
            nextStep,
            user: { ...existingUser, role: 'owner' },
          };
        }

        // Case B: Already Google user → just log them in
        if (
          existingUser.business_id &&
          existingUser.storeUsers?.[0]?.store_id
        ) {
          // ✅ Fetch enriched data
          const data = await this.getUserWithStores(existingUser.email);
          return {
            nextStep: 'COMPLETED',
            data,
          };
        }

        const nextStep =
          !existingUser.business_id && !existingUser.storeUsers?.[0]?.store_id
            ? 'REGISTER_BUSINESS'
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
        role: 'owner',
        business_id: null,
        status: 'pending_setup',
        auth_provider: 'google', // track provider
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newUser =
        await this.usersService.createUserWithTransaction(payload);

      return {
        message: 'Google account  registered successfully',
        nextStep: 'REGISTER_BUSINESS',
        user: newUser,
      };
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'signUpWithGoogle');
    }
  }
}
