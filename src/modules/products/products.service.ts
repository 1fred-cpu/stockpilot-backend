import { Injectable, Inject } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { isValidUUID } from "../../../utils/id-validator";

@Injectable()
export class ProductsService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any // Inject Supabase client
    ) {}
    create(createProductDto: CreateProductDto) {
        return "This action adds a new product";
    }
    // Method -- Post
    // Access -- Private
    // Function:  A function to create a new product
    // Returns: A created product or throws an error if the product already exists
    async createProduct(createProductDto: CreateProductDto) {
        try {
            // Check if the product already exists in products
            const { data, error } = await this.supabase
                .from("Products")
                .select("*")
                .eq("sku", createProductDto.sku)
                .maybeSingle();

            // If an error occurs or data is found, throw an error
            if (error) {
                throw new Error(
                    "An error occured while checking product existence"
                );
            }

            if (data) {
                throw new ConflictException("Product already exists");
            }

            // Create  new product
            const { error: createError } = await this.supabase
                .from("Products")
                .insert([createProductDto]);

            if (createError) {
                throw new Error("An error occured while creating product");
            }

            return data;
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            } else if (error instanceof Error) {
                throw new InternalServerErrorException(error.message);
            }
            // Logs error to the  console
            this.logger.error("Error creating product: ", error.message);
            throw new InternalServerErrorException(
                "An unexpected error occurred while creating the product"
            );
        }
    }

    findAll() {
        return `This action returns all products`;
    }

    findOne(id: number) {
        return `This action returns a #${id} product`;
    }

    update(id: number, updateProductDto: UpdateProductDto) {
        return `This action updates a #${id} product`;
    }

    remove(id: number) {
        return `This action removes a #${id} product`;
    }
}
