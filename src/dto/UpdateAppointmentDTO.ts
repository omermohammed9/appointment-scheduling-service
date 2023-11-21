import {IsOptional, IsDateString, IsString, IsNotEmpty, IsTimeZone, IsInt} from 'class-validator';
import {IsTimeFormat} from "./TimeFormat";

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

    @IsOptional()
    @IsString()
    readonly doctorName?: string;
}
