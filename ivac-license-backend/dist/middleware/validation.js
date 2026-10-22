import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof ZodError) {
                const formatted = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                sendError(res, 'Request validation failed', 422, 'VALIDATION_ERROR', formatted);
                return;
            }
            sendError(res, 'Invalid request payload', 400, 'INVALID_PAYLOAD');
        }
    };
}
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (err) {
            if (err instanceof ZodError) {
                const formatted = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                sendError(res, 'Query parameter validation failed', 422, 'VALIDATION_ERROR', formatted);
                return;
            }
            sendError(res, 'Invalid query parameters', 400, 'INVALID_QUERY');
        }
    };
}
