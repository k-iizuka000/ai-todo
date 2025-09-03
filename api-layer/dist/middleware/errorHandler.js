export const errorHandler = (error, req, res, _next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        switch (prismaError.code) {
            case 'P2002':
                statusCode = 409;
                message = 'Resource already exists';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Resource not found';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Foreign key constraint failed';
                break;
            default:
                statusCode = 400;
                message = 'Database operation failed';
        }
    }
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
    }
    if (error.message && error.message.includes('Too many requests')) {
        statusCode = 429;
        message = 'Too many requests';
    }
    const response = {
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
    console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.userId,
        error: error.stack
    });
    res.status(statusCode).json(response);
};
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
};
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
