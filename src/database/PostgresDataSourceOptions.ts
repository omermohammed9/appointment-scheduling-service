import {config} from "dotenv";
import Subscriber from "@/database/Subscriber";
import {Appointment} from "@/entity/Appointment";
import {PatientCache} from "@/entity/PatientCache";
import {DataSourceOptions} from "typeorm";

config({path: "./src/.env"});


export const PostgresDataSourceOptions = (): DataSourceOptions => {
    return  {
        type: 'postgres',
        host: String(process.env.DB_HOST) || 'No Host Provided for Postgres',
        port: parseInt(process.env.DB_PORT || 'No Port Provided for Postgres' ),
        username: String(process.env.DB_USERNAME) || 'No Username Provided for Postgres',
        password: String(process.env.DB_PASSWORD) || 'No Password Provided for Postgres',
        database: String(process.env.DB_DATABASE) || 'No Database Provided for Postgres',
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
        entities:  [
            Appointment,
            PatientCache
        ],
        subscribers: [
            Subscriber
        ],
        migrations: [
            process.env.NODE_ENV === 'production' ? 'dist/migration/*.js' : 'src/database/migration/*.ts'
        ],
        migrationsRun: process.env.NODE_ENV === 'production',
    };
}