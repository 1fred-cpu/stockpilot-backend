// permissions.service.ts
import {
    Injectable,
    Inject,
    Logger,
    BadRequestException
} from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js";
import { HandleErrorService } from "../../helpers/handle-error.helper";
@Injectable()
export class PermissionService {
    private readonly logger = new Logger(PermissionService.name);

    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
        private readonly errorHandler: HandleErrorService
    ) {}

    async createDefaultRole(businessId: string, ownerUserId: string) {
        try {
            // Assign owner as Admin
            const { error: assignError } = await this.supabase
                .from("users")
                .update({
                    role: "Admin",
                    updated_at: new Date().toISOString()
                })
                .match({
                    business_id: businessId,
                    owner_user_id: ownerUserId
                });

            if (assignError) throw new BadRequestException(assignError.message);

            this.logger.log(`Default role created for business ${businessId}
            owner`);
        } catch (error) {
            this.errorHandler.handleServiceError(error, "createDefaultRole");
        }
    }
}
