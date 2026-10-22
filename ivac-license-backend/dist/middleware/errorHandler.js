import { sendError } from '../utils/response.js';
export function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';
    console.error('[Error]', err);
    let statusCode = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_SERVER_ERROR';
    if (err.code === 'P2002') {
        statusCode = 409;
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'resource';
        message = `A conflict occurred: A record with this ${target} already exists.`;
    }
    else if (err.code === 'P2028' || err.message?.includes('expired transaction')) {
        statusCode = 503;
        code = 'TRANSACTION_TIMEOUT';
        message = 'The database transaction timed out under high load. Please retry in a few moments.';
    }
    sendError(res, statusCode === 500 && !isDev ? 'An unexpected server error occurred.' : message, statusCode, code, isDev ? err.stack : undefined);
}
export function notFoundHandler(req, res) {
    sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
}
