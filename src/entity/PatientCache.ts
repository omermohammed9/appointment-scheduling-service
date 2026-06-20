/**
 * Purpose: Entity representing locally cached patient data synced from Patient Service.
 * Author Scope: Lead Software Engineer / System Architect
 * Dependencies: typeorm
 */

import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class PatientCache extends BaseEntity {
  @PrimaryColumn()
  id!: number; // Non-autoincrement — mirrors Patient.id from Patient Service

  @Column()
  name!: string;
}
