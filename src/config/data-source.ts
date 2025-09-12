// data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.SUPABASE_DB_URI,
    entities: [__dirname + "../entities/*.{.ts,.js}"],
    migrations: [__dirname + ".../migration/*{.ts,.js}"],
    synchronize: false, // never true in production
    logging: true,
    ssl: { rejectUnauthorized: false }
});
