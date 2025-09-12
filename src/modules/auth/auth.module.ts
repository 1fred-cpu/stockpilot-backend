import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../entities/user.entity";
import { StoreUser } from "../../entities/store-user.entity";
import { Store } from "../../entities/store.entity";
import { HandleErrorService } from "../../helpers/handle-error.helper";

@Module({
    imports: [TypeOrmModule.forFeature([User, StoreUser, Store])],
    controllers: [AuthController],
    providers: [AuthService, HandleErrorService]
})
export class AuthModule {}
