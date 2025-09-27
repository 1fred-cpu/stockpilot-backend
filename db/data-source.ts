// data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.SUPABASE_DB_URI,
  //   entities: [__dirname + '/../entities/*.entity.{.ts,.js}'],
  //   migrations: [__dirname + './../migrations/*{.ts,.js}'],
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: false, // never true in production
  logging: true,
  ssl: { rejectUnauthorized: false },
});
