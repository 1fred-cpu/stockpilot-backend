import {
    Injectable,
    Inject,
    Logger,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException
} from "@nestjs/common";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { isValidUUID } from "../../../utils/id-validator";
import { InventoryService } from "../inventory/inventory.service";
import { Response } from "express";

@Injectable()
export class SalesService {
    private logger = new Logger(SalesService.name);
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any,
        private readonly inventoryService: InventoryService
    ) {}
    async createSale(createSaleDto: CreateSaleDto) {
        try {
            // 1. Validate store ID
            if (!isValidUUID(createSaleDto.store_id)) {
                throw new BadRequestException("Invalid store ID format");
            }

            // 2. Check if store exists
            const { data: store, error: fetchError } = await this.supabase
                .from("stores")
                .select("*")
                .eq("id", createSaleDto.store_id)
                .maybeSingle();

            if (fetchError) {
                throw new BadRequestException(
                    `Error checking store existence: ${fetchError.message}`
                );
            }
            if (!store) {
                throw new NotFoundException("Store doesn't exist");
            }

            const createdSales:any[] = [];

            for (const sale of createSaleDto.sales) {
                // 3. Validate idempotency key
                if (!sale.idempotency_key) {
                    throw new BadRequestException(
                        "idempotency_key was not provided"
                    );
                }

                // 4. Validate product exists and belongs to this store
                const { data: product, error: productError } =
                    await this.supabase
                        .from("products")
                        .select("id")
                        .match({"id": sale.product_id,
                        store_id : createSaleDto.store_id,
                        })
                        .maybeSingle();

                if (productError) {
                    throw new BadRequestException(
                        `Error checking product existence: ${productError.message}`
                    );
                }
                if (!product) {
                    throw new NotFoundException(
                        `Product with ID ${sale.product_id} not found in this store`
                    );
                }

                // 5. Check idempotency key in stock movements
                const { data: existingMovement, error: movError } =
                    await this.supabase
                        .from("stock movements")
                        .select("id")
                        .eq("idempotency_key", sale.idempotency_key)
                        .maybeSingle();

                if (movError) {
                    throw new BadRequestException(
                        `Error checking stock movement: ${movError.message}`
                    );
                }
                if (existingMovement) {
                    this.logger.warn(
                        `Duplicate sale skipped: ${sale.idempotency_key}`
                    );
                    continue;
                }

                // 6. Create sale record
                const { data: newSale, error: createError } =
                    await this.supabase
                        .from("sales")
                        .insert({
                            ...sale,
                            store_id: createSaleDto.store_id,
                            sale_date: new Date(createSaleDto.sale_date)
                        })
                        .select()
                        .maybeSingle();

                if (createError) {
                    throw new BadRequestException(
                        `Error creating sale record: ${createError.message}`
                    );
                }

                // 7. Adjust stock
                await this.inventoryService.stockMove({
                    inventory_id: sale.inventory_id,
                    change: -sale.quantity,
                    type: sale.type,
                    idempotency_key: sale.idempotency_key
                });

                createdSales.push(newSale);
            }

            return createdSales;
        } catch (error) {
            this.logger.error(`Oops an error occurred: ${error.message}`);
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(
                "An error occurred while creating sale record. Try again later"
            );
        }
    }

    findAll() {
        return `This action returns all sales`;
    }

    findOne(id: number) {
        return `This action returns a #${id} sale`;
    }

    update(id: number, updateSaleDto: UpdateSaleDto) {
        return `This action updates a #${id} sale`;
    }

    remove(id: number) {
        return `This action removes a #${id} sale`;
    }
}
