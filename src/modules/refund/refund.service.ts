import { DataSource } from "typeorm";
import { Sale } from "../../entities/sale.entity";
import { SaleItem } from "../../entities/sale-item.entity";
import { Refund } from "../../entities/refund.entity";
import { ReturnItem } from "../../entities/return-item.entity";
import { HandleErrorService } from "../../helpers/handle-error.helper";
import { NotFoundException, BadRequestException } from "@nestjs/common";
interface ReturnRequest {
    sale_item_id: string;
    quantity: number;
    reason?: string;
}

export class RefundService {
    constructor(
        private dataSource: DataSource,
        private readonly errorHandler: HandleErrorService
    ) {}

    async processRefundAndReturn(
        saleId: string,
        returnItems: ReturnRequest[],
        refundAmount: number,
        reason?: string
    ) {
        try {
            return await this.dataSource.transaction(async manager => {
                // 1. Check sale
                const sale = await manager.getRepository(Sale).findOne({
                    where: { id: saleId },
                    relations: ["sale_items"]
                });
                if (!sale) throw new NotFoundException("Sale not found");

                // 2. Create refund record
                let refund: Refund | null = null;
                if (refundAmount > 0) {
                    refund = manager.getRepository(Refund).create({
                        sale_id: sale.id,
                        amount: refundAmount,
                        reason,
                        status: "completed"
                    });
                    await manager.save(refund);
                }

                // 3. Handle returned items
                const returnResults: ReturnItem[] = [];
                for (const rItem of returnItems) {
                    const saleItem = sale.sale_items.find(
                        si => si.id === rItem.sale_item_id
                    );
                    if (!saleItem) {
                        throw new NotFoundException(
                            `Sale item ${rItem.sale_item_id} not found`
                        );
                    }

                    if (rItem.quantity > saleItem.quantity) {
                        throw new BadRequestException(
                            `Return qty cannot exceed purchased qty for item ${saleItem.id}`
                        );
                    }

                    // Record return
                    const returnRecord = manager
                        .getRepository(ReturnItem)
                        .create({
                            sale_item_id: saleItem.id,
                            quantity: rItem.quantity,
                            reason: rItem.reason
                        });
                    await manager.save(returnRecord);
                    returnResults.push(returnRecord);

                    // Increment stock back
                    await manager.query(
                        `UPDATE store_inventory 
           SET quantity = quantity + $1 
           WHERE variant_id = $2 AND store_id = $3`,
                        [rItem.quantity, saleItem.variant_id, sale.store_id]
                    );
                }

                return {
                    message: "Refund & Return processed",
                    refund,
                    returnedItems: returnResults
                };
            });
        } catch (error) {
            this.errorHandler.handleServiceError(
                error,
                "processRefundAndReturn"
            );
        }
    }
}
