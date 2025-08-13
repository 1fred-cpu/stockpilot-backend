import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Query,
    Param,
    Delete,
    ValidationPipe
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    createUser(@Body() createUserDto: CreateUserDto) {
        return this.usersService.createUser(createUserDto);
    }

    @Get(":id")
    findUser(@Param("id") id: string, @Query("store_id") storeId?: string) {
        return this.usersService.findUser(id, storeId);
    }

    @Patch(":id")
    updateUser(
        @Param("id") id: string,
        @Body() updateUserDto: Partial<CreateUserDto>
    ) {
        return this.usersService.updateUser(id, updateUserDto);
    }

    @Get()
    findAllUsers(
        @Query("store_id") storeId?: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("search") search?: string
    ) {
        return this.usersService.findAllUsers({
            storeId,
            page: Number(page),
            limit: Number(limit),
            search
        });
    }

    @Delete(":id")
    deleteUser(@Param("id") id: string) {
        return this.usersService.deleteUser(id);
    }
}
