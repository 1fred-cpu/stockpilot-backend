// dto/update-store-users.dto.ts
import { IsArray } from "class-validator";

export class UpdateStoreUsersDto {
    @IsArray()
    actions: {
        userId: string;
        email?: string;
        action: "remove" | "assignRole";
        role?: string; // required only if action = assignRole
    }[];
}
