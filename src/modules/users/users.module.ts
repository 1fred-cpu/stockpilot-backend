import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SupabaseModule } from 'src/lib/supabase.module';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "../../entities/user.entity";
import {HandleErrorService} from "../../helpers/handle-error.helper";

@Module({
  imports: [SupabaseModule, TypeOrmModule.forFeature([User]), ], 
  controllers: [UsersController],
  providers: [UsersService, HandleErrorService],
})
export class UsersModule {}
