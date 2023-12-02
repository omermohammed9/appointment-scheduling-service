import {IsOptional, IsDateString, IsString, IsNotEmpty, IsTimeZone, IsInt, Min} from 'class-validator';
import {IsTimeFormat} from "../utils/TimeFormat";

export class UpdateAppointmentDTO {
    @IsInt()
    readonly patientId!: number;

    @IsOptional()
    @IsDateString()
    readonly date?: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty(({message: 'Time Zone is required'}))
    @IsTimeZone()
    readonly timezone?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({message: 'Time Zone is required'})
    @IsTimeFormat({ message: 'Appointment Time must be in the format HH:MM AM/PM' })
    readonly AppointmentTime?: string;

    @IsInt()
    @IsNotEmpty({message: 'Duration is required'})
    @Min(1)

    readonly duration!: number;

    @IsOptional()
    @IsString()
    readonly doctorName?: string;
}
