import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';


export function validationDataMiddleware<T extends object>(type: new () => T ): (req: Request, res: Response, next: NextFunction) => void {
    return async (req, res, next) => {
        console.log('validationMiddleware executed');
        const validationObj = plainToInstance(type, req.body);
        const errors: ValidationError[] = await validate(validationObj);
        if (errors.length > 0) {
            console.log("VALIDATION ERRORS", errors);
            return res.status(400).json({ errors });
        } else {
            next();
        }
    };
}

export const validateIdMiddlewareRequest  = (req: Request, res: Response, next: NextFunction)  => {
    const id = +req.params.id;
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: 'ID provided is NOT a number' });
    }
    req.validatedId = id;
    next();
}