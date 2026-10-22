import { sendError } from '../utils/response.js';
export function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';
    console.error('[Error]', err);
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    sendError(res, statusCode === 500 && !isDev ? 'An unexpected server error occurred.' : message, statusCode, code, isDev ? err.stack : undefined);
}
export function notFoundHandler(req, res) {
    sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
}
