import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  Return,
  ReturnStatus,
  ReturnResolution,
} from '../../entities/return.entity';
import { Refund, RefundStatus } from '../../entities/refund.entity';
import { Exchange, ExchangeStatus } from '../../entities/exchange.entity';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { StoreInventory } from '../../entities/store-inventory.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import {
  StoreCredit,
  StoreCreditStatus,
} from '../../entities/store-credit.entity';
import { HandleErrorService } from '../../helpers/handle-error.helper';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';

export class ReturnsService {
  constructor(
    private dataSource: DataSource,
    private readonly errorHandler: HandleErrorService,
  ) {}
  /**
   * Staff creates a return request (can include multiple items, exchanges, etc.)
   */
  async createReturn(dto: CreateReturnDto) {
    try {
      return this.dataSource.transaction(async (manager) => {
        // 1. Validate sale
        const sale = await manager.findOne(Sale, {
          where: { id: dto.saleId },
        });
        if (!sale) throw new NotFoundException('Sale not found');

        const createdReturns: Return[] = [];

        // 2. Loop through each return item
        for (const item of dto.items) {
          const saleItem = await manager.findOne(SaleItem, {
            where: { id: item.saleItemId },
          });

          if (!saleItem || saleItem.sale_id !== dto.saleId) {
            throw new NotFoundException(
              `Sale item ${item.saleItemId} not found for this sale`,
            );
          }

          const quantity = item.quantity ?? saleItem.quantity;

          // Create return record
          const ret = manager.create(Return, {
            store_id: dto.storeId,
            sale_id: dto.saleId,
            sale_item_id: item.saleItemId,
            reason: item.reason,
            resolution: item.resolution,
            quantity,
            status: ReturnStatus.PENDING,
            staff_id: dto.staffId ?? null,
          });
          await manager.save(ret);

          // --- Handle exchange requests ---
          if (item.resolution === ReturnResolution.EXCHANGE && item.exchanges) {
            for (const ex of item.exchanges) {
              const newInventoryRow = await manager.findOne(ProductVariant, {
                where: {
                  id: ex.newProductVariantId,
                  store_id: sale.store_id,
                },
              });

              if (!newInventoryRow) {
                throw new NotFoundException(
                  `Exchange item ${ex.newProductVariantId} not found in inventory`,
                );
              }

              const priceDifference =
                Number(newInventoryRow.price ?? 0) -
                Number(saleItem.unit_price ?? 0);

              const exchange = manager.create(Exchange, {
                store_id: dto.storeId,
                return_id: ret.id,
                new_product_variant_id: ex.newProductVariantId,
                price_difference: priceDifference,
                status: ExchangeStatus.PENDING,
              });
              await manager.save(exchange);
            }
          }

          // --- Handle refund requests ---
          if (item.resolution === ReturnResolution.REFUND) {
            const refund = manager.create(Refund, {
              store_id: dto.storeId,
              return_id: ret.id,
              amount: Number(saleItem.unit_price) * quantity,
              method: sale.payment_method ?? 'cash',
              status: RefundStatus.PENDING,
            });
            await manager.save(refund);
          }

          // --- Handle store credit requests ---
          if (item.resolution === ReturnResolution.STORE_CREDIT) {
            const credit = manager.create(StoreCredit, {
              store_id: dto.storeId,
              return_id: ret.id,
              customer_id: sale.customer_id,
              amount: Number(saleItem.unit_price) * quantity,
              status: StoreCreditStatus.PENDING, // waiting for manager approval
            });
            await manager.save(credit);
          }

          createdReturns.push(ret);
        }

        return createdReturns;
      });
    } catch (error) {
      this.errorHandler.handleServiceError(error, 'createReturn');
    }
  }

  /**
   * Manager reviews multiple returns in one request.
   */
  async reviewReturns(dto: ReviewReturnDto) {
    return this.dataSource.transaction(async (manager) => {
      const results: any[] = [];

      for (const returnId of dto.returnIds) {
        const ret = await manager.findOne(Return, {
          where: { id: returnId },
          relations: ['sale_item'],
        });
        if (!ret) throw new NotFoundException(`Return ${returnId} not found`);

        // Reject flow
        if (!dto.approve) {
          ret.status = ReturnStatus.REJECTED;
          ret.inspection_notes = dto.notes ?? null;
          ret.manager_id = dto.managerId ?? null;
          await manager.save(ret);
          results.push({ return: ret, status: 'rejected' });
          continue;
        }

        // Approve path
        const saleItem = await manager.findOne(SaleItem, {
          where: { id: ret.sale_item_id },
        });
        if (!saleItem) throw new NotFoundException('Sale item not found');

        const sale = await manager.findOne(Sale, {
          where: { id: ret.sale_id },
        });
        if (!sale) throw new NotFoundException('Sale not found');

        ret.status = ReturnStatus.APPROVED;
        ret.manager_id = dto.managerId ?? null;
        ret.inspection_notes = dto.notes ?? null;
        await manager.save(ret);

        const quantity = Number(ret.quantity ?? saleItem.quantity);
        const lineAmount = Number(saleItem.unit_price) * quantity;

        // === Refund ===
        if (ret.resolution === ReturnResolution.REFUND) {
          const refund = manager.create(Refund, {
            return_id: ret.id,
            amount: lineAmount,
            method: dto.refundMethod ?? sale.payment_method ?? 'cash',
            status: RefundStatus.INITIATED,
          });
          await manager.save(refund);

          refund.status = RefundStatus.COMPLETED;
          refund.processed_at = new Date();
          await manager.save(refund);

          saleItem.status = 'returned';
          await manager.save(saleItem);

          // restock if not defective
          const reason = (ret.reason || '').toLowerCase();
          if (
            !reason.includes('fault') &&
            !reason.includes('defect') &&
            !reason.includes('damag')
          ) {
            const inv = await manager.findOne(StoreInventory, {
              where: {
                store_id: sale.store_id,
                variant_id: saleItem.variant_id,
              },
            });
            if (inv) {
              inv.quantity = Number(inv.quantity ?? 0) + quantity;
              await manager.save(inv);
            }
          }

          // 🔑 Deduct refund from sale.net_amount
          sale.net_amount = Number(sale.net_amount ?? 0) - lineAmount;
          await manager.save(sale);

          ret.status = ReturnStatus.REFUNDED;
          await manager.save(ret);
          results.push({ return: ret, refund });
          continue;
        }

        // === Store Credit ===
        if (ret.resolution === ReturnResolution.STORE_CREDIT) {
          const credit = manager.create(StoreCredit, {
            store_id: dto.storeId,
            return_id: ret.id,
            customer_id: sale.customer_id,
            amount: lineAmount,
            status: StoreCreditStatus.ACTIVE,
          });
          await manager.save(credit);

          saleItem.status = 'returned';
          await manager.save(saleItem);

          // restock if not defective
          const reason = (ret.reason || '').toLowerCase();
          if (
            !reason.includes('fault') &&
            !reason.includes('defect') &&
            !reason.includes('damag')
          ) {
            const inv = await manager.findOne(StoreInventory, {
              where: {
                store_id: sale.store_id,
                variant_id: saleItem.variant_id,
              },
            });
            if (inv) {
              inv.quantity = Number(inv.quantity ?? 0) + quantity;
              inv.total_quantity = Number(inv.total_quantity ?? 0) + quantity;
              await manager.save(inv);
            }
          }

          // 🔑 Deduct store credit from sale.net_amount
          sale.net_amount = Number(sale.net_amount ?? 0) - lineAmount;
          await manager.save(sale);

          ret.status = ReturnStatus.CREDITED;
          await manager.save(ret);
          results.push({ return: ret, storeCredit: credit });
          continue;
        }

        // === Exchange ===
        if (ret.resolution === ReturnResolution.EXCHANGE) {
          const exchanges = await manager.find(Exchange, {
            where: { return_id: ret.id },
          });
          if (!exchanges || exchanges.length === 0) {
            throw new NotFoundException('No exchange records found');
          }

          saleItem.status = 'returned';
          await manager.save(saleItem);

          // restock if not defective
          const reason = (ret.reason || '').toLowerCase();
          if (
            !reason.includes('fault') &&
            !reason.includes('defect') &&
            !reason.includes('damag')
          ) {
            const origInv = await manager.findOne(StoreInventory, {
              where: {
                store_id: sale.store_id,
                variant_id: saleItem.variant_id,
              },
            });
            if (origInv) {
              origInv.quantity = Number(origInv.quantity ?? 0) + quantity;
              origInv.total_quantity =
                Number(origInv.total_quantity ?? 0) + quantity;
              await manager.save(origInv);
            }
          }

          for (const exchange of exchanges) {
            const inventoryRow = await manager.findOne(StoreInventory, {
              where: {
                store_id: sale.store_id,
                variant_id: exchange.new_product_variant_id,
              },
            });
            if (!inventoryRow) {
              throw new NotFoundException(
                `Exchange item ${exchange.new_product_variant_id} not available`,
              );
            }
            if (Number(inventoryRow.quantity ?? 0) < 1) {
              throw new BadRequestException(
                'Insufficient stock for exchange item',
              );
            }

            inventoryRow.quantity = Number(inventoryRow.quantity) - 1;
            await manager.save(inventoryRow);

            // 🔑 Adjust sale.net_amount based on price difference
            if (Number(exchange.price_difference) < 0) {
              const refundAmount = Math.abs(Number(exchange.price_difference));
              const refund = manager.create(Refund, {
                return_id: ret.id,
                amount: refundAmount,
                method: dto.refundMethod ?? sale.payment_method ?? 'cash',
                status: RefundStatus.COMPLETED,
                processed_at: new Date(),
              });
              await manager.save(refund);

              sale.net_amount = Number(sale.net_amount ?? 0) - refundAmount;
              await manager.save(sale);
            } else if (Number(exchange.price_difference) > 0) {
              sale.net_amount =
                Number(sale.net_amount ?? 0) +
                Number(exchange.price_difference);
              await manager.save(sale);
            }

            exchange.status = ExchangeStatus.COMPLETED;
            await manager.save(exchange);
          }

          ret.status = ReturnStatus.EXCHANGED;
          await manager.save(ret);

          results.push({ return: ret, exchanges });
          continue;
        }
      }

      return results;
    });
  }
  /**
   * Get return by id (simple read)
   */
  async getReturn(returnId: string) {
    return this.dataSource.manager.findOne(Return, {
      where: { id: returnId },
    });
  }
}
