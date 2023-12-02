import {IsInt, IsString, IsOptional, IsNotEmpty, IsDateString, Min, Matches} from 'class-validator';
import {IsTimeFormat} from "../utils/TimeFormat";
import {IsValidTimeZone} from "../utils/ValidTimeZone";

class CreateAppointmentDTO {
    @IsInt()
    readonly patientId!: number;

    @IsNotEmpty()
    @IsDateString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Date must be in the format YYYY-MM-DD'
    })
    readonly date!: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @IsTimeFormat({ message: 'Appointment Time must be in the format HH:MM AM/PM' })
    readonly AppointmentTime?: string;

    @IsString()
    @IsNotEmpty({message: 'Time Zone is required'})
    @IsValidTimeZone( {message: 'Invalid timezone'}) // Custom timezone validator
    readonly timezone!: string;

    @IsInt()
    @IsNotEmpty({message: 'Duration is required'})
    @Min(1)
    readonly duration!: number;

    @IsString()
    readonly doctorName!: string;
}

export default CreateAppointmentDTO