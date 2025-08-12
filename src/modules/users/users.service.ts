import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}
  async createUser(createUserDto: CreateUserDto) {
    try {
      // Checks if user already exists
      const { data: existsUser, error: existsError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', createUserDto.id)
        .maybeSingle();

      if (existsError) {
        throw new BadRequestException(
          `Error checking user existence: ${existsError.message}`,
        );
      }

      if (existsUser) {
        throw new ConflictException('User already exists');
      }
      // Create a new user

      const { data: newUser, error: createError } = await this.supabase
        .from('users')
        .insert([createUserDto])
        .select();

      if (createError) {
        throw new BadRequestException(
          `Error creating user: ${createError.message}`,
        );
      }

      return { message: 'User created successfully', user: newUser[0] };
    } catch (error) {
      if (error instanceof BadRequestException || ConflictException)
        throw error;
      console.error(error.message);
      throw new InternalServerErrorException(
        'An error occured while creating user',
      );
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
