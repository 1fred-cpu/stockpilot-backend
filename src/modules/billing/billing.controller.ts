import { Controller, Body, Post } from "@nestjs/common";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
    constructor(private readonly billingService: BillingService) {}

    @Post("subscribe")
    async subscribeStore(
        @Body()
        dto: {
            storeId: string;
            plan: "Starter" | "Growth" | "Enterprise";
        }
    ) {
        const { storeId, plan } = dto;
        return this.billingService.subscribeStore(storeId, plan);
    }

    @Post("portal")
    async billingPortal(
        @Body()
        dto: {
            storeId: string;
        }
    ) {
        const { storeId } = dto;
        return this.billingService.billingPortal(storeId);
    }
    @Post("cancel")
    async cancelSubcribe(
        @Body()
        dto: {
            storeId: string;
            cancelAtPeriodEnd: boolean;
        }
    ) {
        return this.billingService.cancelSubcribe(dto);
    }
    @Post("change-plan")
    async changePlan(
        @Body()
        dto: {
            storeId: string;
            plan: string;
        }
    ) {
        const { storeId, plan } = dto;
        return this.billingService.changePlan(storeId, plan);
    }
}
