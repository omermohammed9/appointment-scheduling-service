import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsTimeFormat(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'IsTimeFormat',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any): boolean {
                    const regex = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$|^(2[0-3]|[01]?[0-9]):[0-5][0-9]$/i;
                    return typeof value === 'string' && regex.test(value);
                },
            },
        });
    };
}
