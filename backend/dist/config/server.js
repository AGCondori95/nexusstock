"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./env");
const notFound_1 = require("@middleware/notFound");
const errorHandler_1 = require("@middleware/errorHandler");
function createServer() {
    const app = (0, express_1.default)();
    // ── Security middleware ──────────────────────────────────────────────────
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
                imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
                connectSrc: ["'self'"],
            },
        },
    }));
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN,
        credentials: true, // Necesario para httpOnly cookies (JWT)
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    // ── Body parsing ─────────────────────────────────────────────────────────
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // ── Health check (no auth requerido) ─────────────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({
            success: true,
            data: {
                status: 'ok',
                environment: env_1.env.NODE_ENV,
                version: process.env.npm_package_version ?? '0.0.0',
            },
            timestamp: new Date().toISOString(),
        });
    });
    // ── API Routes (se añadirán en Fase 2) ───────────────────────────────────
    // app.use('/api/v1/auth',      authRouter);
    // app.use('/api/v1/inventory', inventoryRouter);
    // ── Error handlers (deben ir AL FINAL) ───────────────────────────────────
    app.use(notFound_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
exports.createServer = createServer;
