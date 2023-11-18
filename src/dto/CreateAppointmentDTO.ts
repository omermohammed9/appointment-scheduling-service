import { IsInt, IsString, IsDate } from 'class-validator';

class CreateAppointmentDTO {
    @IsInt()
    readonly patientId!: number;

    @IsDate()
    readonly date!: Date;

    @IsString()
    readonly time!: string;

    @IsString()
    readonly doctorName!: string;
}

export default CreateAppointmentDTO