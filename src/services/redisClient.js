/**
 * ============================================
 *  Redis Client Service
 * ============================================
 *
 * This file creates a connection to the Redis server.
 *
 * WHY REDIS?
 * ----------
 * In a distributed system with multiple server instances,
 * each server needs to share rate limit data. Redis acts as
 * a centralized datastore that all servers can read/write to.
 *
 * Without Redis, each server would maintain its own counter,
 * and a user could bypass the limit by spreading requests
 * across different servers.
 *
 * We use the "ioredis" library — it's fast, reliable, and
 * widely used in production Node.js applications.
 */

const Redis = require("ioredis");

// Read Redis connection details from environment variables
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;

// Create a new Redis client instance
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,

  // Retry connecting if Redis is temporarily unavailable
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000); // max 2 second delay
    console.log(`⏳ Retrying Redis connection in ${delay}ms... (attempt ${times})`);
    return delay;
  },
});

// Log connection events for easier debugging
redisClient.on("connect", () => {
  console.log(`✅ Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

// Export the client so other files can use it
module.exports = redisClient;
