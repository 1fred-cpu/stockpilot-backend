import { Controller, Post, Param, Body, ValidationPipe } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";

@Controller("onboarding/:owner_id")
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post("create-store")
    async handleCreateStore(
        @Body(ValidationPipe) createStoreDto: CreateStoreDto,
        @Param("owner_id") owner_id: string
    ) {
        return this.onboardingService.createStore(createStoreDto, owner_id);
    }

    @Post("create/admin-user")
    async handleCreateAdminUser(
        @Body(ValidationPipe) createAdminUserDto: CreateAdminUserDto,
        @Param("owner_id") owner_id: string
    ) {
        return this.onboardingService.createAdminUser(
            createAdminUserDto,
            owner_id
        );
    }
}
