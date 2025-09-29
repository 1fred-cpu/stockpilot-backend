import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedSaleAndSaleItem1759059628375 implements MigrationInterface {
    name = 'UpdatedSaleAndSaleItem1759059628375'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_c210a330b80232c29c2ad68462a"`);
        await queryRunner.query(`ALTER TABLE "sales" ADD "sale_code" text`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_c210a330b80232c29c2ad68462a" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_c210a330b80232c29c2ad68462a"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "sale_code"`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_c210a330b80232c29c2ad68462a" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
