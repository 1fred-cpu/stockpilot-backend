import {
    Injectable,
    Inject,
    InternalServerErrorException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger
} from "@nestjs/common";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { isValidUUID } from "../../../utils/id-validator";
@Injectable()
export class StoresService {
    private readonly logger = new Logger(StoresService.name);
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: any // Inject Supabase client
    ) {}

    // Method -- Post
    // Access -- Public
    // Function:  A function to create a new store
    // Returns: A success message or throws an error if the store already exists
    async createStore(createStoreDto: CreateStoreDto) {
        try {
            // Check if the store already exists for the owner
            const { data, error } = await this.supabase
                .from("Stores")
                .select("*")
                .eq("owner_id", createStoreDto.owner_id)
                .maybeSingle();

            // If an error occurs or data is found, throw an error
            if (error) {
                throw new Error(
                    "An error occured while  checking store existence"
                );
            }

            if (data) {
                throw new ConflictException("Store already exists");
            }

            // Create the new store
            const { error: createError } = await this.supabase
                .from("Stores")
                .insert([{ ...createStoreDto }]);

            if (createError) {
                throw new Error("An error occured while creating store");
            }

            return { message: "Store created successfully" };
        } catch (error) {
            // Logs error to the  console
            this.logger.error("Error creating store: ", error.message);

            if (error instanceof Error) {
                throw new InternalServerErrorException(error.message);
            } else if (error instanceof ConflictException) {
                throw error; // Re-throw ConflictException
            }
            throw new InternalServerErrorException(
                "An unexpected error occurred while creating the store"
            );
        }
    }

    // Method -- Get
    // Access -- Private
    // Function:  A function to find store
    // Returns: The store to the client if found or throws an error if not found
    async findStore(store_id: string) {
        try {
            // Validate the format of store_id if it matches uuid format
            const isStoreIdValid = isValidUUID(store_id);
            if (!isStoreIdValid) {
                throw new BadRequestException("Invalid format of store_id");
            }

            // Find a store with store_id
            const { data, error } = await this.supabase
                .from("Stores")
                .select("*")
                .eq("store_id", store_id)
                .maybeSingle();

            // If an error occurs while finding store throw an error
            if (error) {
                throw new Error("An error occured while  finding store");
            }
            if (!data) {
                throw new NotFoundException("Store not found");
            }
            // Returns data to client
            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw new InternalServerErrorException(error.message);
            } else if (error instanceof BadRequestException) {
                throw error;
            } else if (error instanceof NotFoundException) {
                throw error;
            }
            // Logs error to the  console
            this.logger.error("Error finding store: ", error.message);
            throw new InternalServerErrorException(
                "An unexpected error occurred while finding  store"
            );
        }
    }

    // Method -- Patch
    // Access -- Private
    // Function:  A function to update store
    /* Returns: Update the store if found and return updated store or throwa an
    error if not found */
    
    async updateStore(store_id: string) {
        try {
            // Validate the format of store_id if it matches uuid format
            const isStoreIdValid = isValidUUID(store_id);
            if (!isStoreIdValid) {
                throw new BadRequestException("Invalid format of store_id");
            }

            // Find a store with store_id
            const { data, error } = await this.supabase
                .from("Stores")
                .select("*")
                .eq("store_id", store_id)
                .maybeSingle();

            // If an error occurs while finding store throw an error
            if (error) {
                throw new Error("An error occured while  finding store");
            }
            if (!data) {
                throw new NotFoundException("Store not found");
            }
            // Returns data to client
            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw new InternalServerErrorException(error.message);
            } else if (error instanceof BadRequestException) {
                throw error;
            } else if (error instanceof NotFoundException) {
                throw error;
            }
            // Logs error to the  console
            this.logger.error("Error finding store: ", error.message);
            throw new InternalServerErrorException(
                "An unexpected error occurred while finding  store"
            );
        }
    }

    findOne(id: number) {
        return `This action returns a #${id} store`;
    }

    update(id: number, updateStoreDto: UpdateStoreDto) {
        return `This action updates a #${id} store`;
    }

    remove(id: number) {
        return `This action removes a #${id} store`;
    }
}
