import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedTables1759160562867 implements MigrationInterface {
    name = 'UpdatedTables1759160562867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exchanges" ADD "quantity" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "store_credits" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD "amount" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "store_credits" DROP COLUMN "used_amount"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD "used_amount" double precision NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_credits" DROP COLUMN "used_amount"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD "used_amount" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "store_credits" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD "amount" numeric(12,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "exchanges" DROP COLUMN "quantity"`);
    }

}
