export function sendSuccess(res, data, message, statusCode = 200, meta) {
    const payload = {
        success: true,
        message,
        data,
        meta,
    };
    return res.status(statusCode).json(payload);
}
export function sendError(res, message, statusCode = 400, code = 'BAD_REQUEST', details) {
    const payload = {
        success: false,
        message,
        error: {
            code,
            details,
        },
    };
    return res.status(statusCode).json(payload);
}
