import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';
import {Min} from "class-validator";

@Entity()
export class Appointment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column()
    date!: Date;

    @Column()
    timezone!: string;

    @Column() 
    AppointmentTime!: string;

    @Column()
    @Min(1)
    duration!: number;

    @Column()
    doctorName!: string;

    @Index()
    @Column()
    patientId!: number;

    @Column({ default: 'SCHEDULED' })
    status!: string;
}