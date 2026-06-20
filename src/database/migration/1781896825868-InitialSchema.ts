import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1781896825868 implements MigrationInterface {
    name = 'InitialSchema1781896825868'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "appointment" ("id" SERIAL NOT NULL, "date" TIMESTAMP NOT NULL, "timezone" character varying NOT NULL, "AppointmentTime" character varying NOT NULL, "duration" integer NOT NULL, "doctorName" character varying NOT NULL, "patientId" integer NOT NULL, CONSTRAINT "PK_e8be1a53027415e709ce8a2db74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "patient_cache" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_d6ece1d774a5d1b84473f3af5ff" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "patient_cache"`);
        await queryRunner.query(`DROP TABLE "appointment"`);
    }

}
