import {Entity, PrimaryGeneratedColumn, Column, BaseEntity} from 'typeorm';
import {Min} from "class-validator";

@Entity()
export class Appointment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

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

    @Column()
    patientId!: number;
}