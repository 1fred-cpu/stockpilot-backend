import { Controller, Post, Param, Body, ValidationPipe } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";

@Controller("onboarding/:ownerId")
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post("create-store")
    async handleCreateStore(
        @Body(ValidationPipe) createStoreDto: CreateStoreDto,
        @Param("ownerId") ownerId: string
    ) {
        return this.onboardingService.createStore(createStoreDto, ownerId);
    }

    @Post("create/admin-user")
    async handleCreateAdminUser(
        @Body(ValidationPipe) createAdminUserDto: CreateAdminUserDto,
        @Param("ownerId") ownerId: string
    ) {
        return this.onboardingService.createAdminUser(
            createAdminUserDto,
            ownerId
        );
    }
}
