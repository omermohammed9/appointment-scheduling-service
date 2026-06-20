import {IsInt, IsString, IsNotEmpty, IsDateString, Min, Matches} from 'class-validator';
import {IsValidTimeZone} from "@/utils/ValidTimeZone";

class CreateAppointmentDTO {
    @IsInt()
    @Min(1)
    readonly patientId!: number;

    @IsNotEmpty()
    @IsDateString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Date must be in the format YYYY-MM-DD'
    })
    readonly date!: Date;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Appointment Time must be in the format HH:MM'
    })
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
    @IsNotEmpty({message: 'Doctor Name is required'})
    readonly doctorName!: string;
}

export default CreateAppointmentDTO