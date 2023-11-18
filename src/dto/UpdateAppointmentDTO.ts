import {IsOptional, IsDateString, IsString, IsNotEmpty, IsTimeZone, IsInt} from 'class-validator';

export class UpdateAppointmentDTO {
    @IsInt()
    readonly patientId!: number;

    @IsOptional()
    @IsDateString()
    readonly date?: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty(({message: 'Time is required'}))
    @IsTimeZone()
    readonly time?: string;

    @IsOptional()
    @IsString()
    readonly doctorName?: string;
}
