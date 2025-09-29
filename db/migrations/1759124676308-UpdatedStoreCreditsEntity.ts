import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedStoreCreditsEntity1759124676308 implements MigrationInterface {
    name = 'UpdatedStoreCreditsEntity1759124676308'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_credits" DROP CONSTRAINT "FK_7503b09d892aa434d8e221419e4"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ALTER COLUMN "customer_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD CONSTRAINT "FK_7503b09d892aa434d8e221419e4" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_credits" DROP CONSTRAINT "FK_7503b09d892aa434d8e221419e4"`);
        await queryRunner.query(`ALTER TABLE "store_credits" ALTER COLUMN "customer_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD CONSTRAINT "FK_7503b09d892aa434d8e221419e4" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
