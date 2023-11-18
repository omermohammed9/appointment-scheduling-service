import { Response } from 'express';
 const sendResponse = (res: Response, statusCode: number, data: any = null, message = '') => {
    if (data) {
        res.status(statusCode).json(data);
    } else {
        res.status(statusCode).json({ message });
    }
}

export default sendResponse