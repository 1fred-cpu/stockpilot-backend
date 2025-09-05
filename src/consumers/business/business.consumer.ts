// business.consumer.ts
import { Controller, Inject, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { SupabaseClient } from "@supabase/supabase-js";
import { PermissionService } from "../../modules/permission/permission.service";
import { BillingService } from "../../modules/billing/billing.service";
import { AnalyticsService } from "../../modules/analytics/analytics.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";

@Controller()
export class BusinessConsumer {
    private readonly logger = new Logger(BusinessConsumer.name);

    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient,
        private readonly permissionService: PermissionService,
        private readonly billingService: BillingService,
        private readonly analyticsService: AnalyticsService,
        private readonly notificationsService: NotificationsService
    ) {}

    @EventPattern("business.events")
    async handleBusinessEvents(@Payload() message: any) {
        const { event, data } = JSON.parse(message.value.toString());

        if (event === "BusinessCreated") {
          console.log("event triggered")
            // Permissions Service
            // await this.permissionService.createDefaultRole(
            //     data.id,
            //     data.owner_user_id
            // );

            // Billing Service
            await this.billingService.createCustomer(
                data.business_id,
                data.owner_user_id
            );

            // // Analytics Service
            // await this.analyticsService.registerBusinessAnalytics(data);

            // Notifications
            await this.notificationsService.sendWelcome(
                data.business_id,
                data.name
            );

            //             // Audit
            //             await this.auditService.logEvent("BusinessCreated", data);
        }
    }
}
