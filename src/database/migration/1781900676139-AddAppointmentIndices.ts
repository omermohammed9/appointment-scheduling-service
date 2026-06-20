import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentIndices1781900676139 implements MigrationInterface {
    name = 'AddAppointmentIndices1781900676139'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patient_cache" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_d6ece1d774a5d1b84473f3af5ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ac1415ad784e6df5c787f7b73" ON "appointment" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_5ce4c3130796367c93cd817948" ON "appointment" ("patientId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5ce4c3130796367c93cd817948"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ac1415ad784e6df5c787f7b73"`);
        await queryRunner.query(`DROP TABLE "patient_cache"`);
    }

}
