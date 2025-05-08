"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.AppError = void 0;
const logger_1 = require("./logger");
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handleError = (err, req, res, next) => {
    if (err instanceof AppError) {
        logger_1.logger.error(`[${err.statusCode}] ${err.message}`);
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }
    logger_1.logger.error(`[500] ${err.message}`);
    return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
};
exports.handleError = handleError;
