import {IsInt, IsString, IsDate, IsOptional, IsNotEmpty} from 'class-validator';
import {IsTimeFormat} from "./TimeFormat";

class CreateAppointmentDTO {
    @IsInt()
    readonly patientId!: number;

    @IsNotEmpty()
    @IsString()
    readonly date!: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty({message: 'Time Zone is required'})
    @IsTimeFormat({ message: 'Appointment Time must be in the format HH:MM AM/PM' })
    readonly AppointmentTime?: string;

    @IsString()
    readonly timezone!: string;

    @IsString()
    readonly doctorName!: string;
}

export default CreateAppointmentDTO