import {Entity, PrimaryGeneratedColumn, Column, BaseEntity} from 'typeorm';

@Entity()
export class Appointment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    date!: Date;

    @Column( { nullable: true })
    timezone!: string;

    @Column()
    AppointmentTime!: string;

    @Column()
    doctorName!: string;

    @Column()
    patientId!: number;
}