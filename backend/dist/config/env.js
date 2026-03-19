"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().min(1024).max(65535).default(3001),
    CORS_ORIGIN: zod_1.z.string().url().default('http://localhost:5173'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
    MONGO_URI: zod_1.z.string().url(),
});
function loadEnv() {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        process.exit(1);
    }
    return parsed.data;
}
exports.env = loadEnv();
