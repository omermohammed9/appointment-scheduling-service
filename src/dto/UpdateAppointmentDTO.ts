import {IsOptional, IsDateString, IsString, IsNotEmpty, IsTimeZone, IsInt, Min, Matches} from 'class-validator';

export class UpdateAppointmentDTO {
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly patientId?: number;

    @IsOptional()
    @IsDateString()
    readonly date?: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty({message: 'Time Zone is required'})
    @IsTimeZone()
    readonly timezone?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Appointment Time must be in the format HH:MM'
    })
    readonly AppointmentTime?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    readonly duration?: number;

    @IsOptional()
    @IsString()
    readonly doctorName?: string;

    @IsOptional()
    @IsString()
    readonly status?: string;
}
