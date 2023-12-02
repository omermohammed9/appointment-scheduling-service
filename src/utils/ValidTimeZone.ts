import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import moment from 'moment-timezone';

export function IsValidTimeZone(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidTimeZone',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any): boolean {
                    return typeof value === 'string' && moment.tz.zone(value) !== null;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid timezone`;
                }
            }
        });
    };
}
