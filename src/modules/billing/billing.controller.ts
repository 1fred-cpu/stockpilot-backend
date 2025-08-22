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
        return this.billingService.billingPortal(storeId, );
    }
}
