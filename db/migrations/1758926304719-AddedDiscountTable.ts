import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedDiscountTable1758926304719 implements MigrationInterface {
    name = 'AddedDiscountTable1758926304719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."discounts_type_enum" AS ENUM('product', 'category', 'store')`);
        await queryRunner.query(`CREATE TYPE "public"."discounts_discount_type_enum" AS ENUM('percentage', 'fixed')`);
        await queryRunner.query(`CREATE TABLE "discounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "name" text NOT NULL, "type" "public"."discounts_type_enum" NOT NULL, "discount_type" "public"."discounts_discount_type_enum" NOT NULL, "value" bigint NOT NULL DEFAULT '0', "product_id" uuid, "category_id" uuid, "min_order_amount" double precision NOT NULL DEFAULT '0', "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_66c522004212dc814d6e2f14ecc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "discounts" ADD CONSTRAINT "FK_588bdd45fd5a79cad73113e871d" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "discounts" ADD CONSTRAINT "FK_33089a790210955b35508a6b493" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "discounts" ADD CONSTRAINT "FK_f171ec2fac945779eb2fd4deb39" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "discounts" DROP CONSTRAINT "FK_f171ec2fac945779eb2fd4deb39"`);
        await queryRunner.query(`ALTER TABLE "discounts" DROP CONSTRAINT "FK_33089a790210955b35508a6b493"`);
        await queryRunner.query(`ALTER TABLE "discounts" DROP CONSTRAINT "FK_588bdd45fd5a79cad73113e871d"`);
        await queryRunner.query(`DROP TABLE "discounts"`);
        await queryRunner.query(`DROP TYPE "public"."discounts_discount_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."discounts_type_enum"`);
    }

}
