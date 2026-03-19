"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
function notFoundHandler(req, res) {
    const body = {
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
        timestamp: new Date().toISOString(),
    };
    res.status(404).json(body);
}
exports.notFoundHandler = notFoundHandler;
