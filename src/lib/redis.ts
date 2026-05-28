import Redis from "ioredis";

/**
 * Global Redis singleton — reused across all server components, API routes,
 * and data-fetching helpers.
 *
 * In development, the singleton is stored on `globalThis` to survive HMR.
 * In production (serverless), the module-level reference persists across
 * warm invocations of the same function instance.
 *
 * This replaces the ~25 scattered `new Redis()` calls that each opened
 * a separate TCP connection and were never explicitly closed.
 */
const globalForRedis = globalThis as unknown as { __redis: Redis };

export const redis: Redis =
    globalForRedis.__redis ||
    new Redis(process.env.REDIS_URL || "", {
        maxRetriesPerRequest: 3,
        lazyConnect: false,
    });

if (process.env.NODE_ENV !== "production") {
    globalForRedis.__redis = redis;
}
