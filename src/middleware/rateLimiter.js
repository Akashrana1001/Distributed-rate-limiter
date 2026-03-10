/**
 * ============================================
 *  Rate Limiter Middleware  (Fixed Window)
 * ============================================
 *
 * HOW THE FIXED WINDOW ALGORITHM WORKS:
 * -------------------------------------
 * 1. Each "window" is a fixed time period (e.g., 60 seconds).
 * 2. When a request arrives, we look up the counter for the
 *    client's IP address in Redis.
 * 3. If the counter doesn't exist, we create it and set an
 *    expiration time equal to the window duration.
 * 4. If the counter exists and is below the limit, we allow
 *    the request and increment the counter.
 * 5. If the counter has reached the limit, we reject the
 *    request with HTTP 429.
 *
 * REDIS KEY FORMAT:
 *   rate_limit:<IP_ADDRESS>
 *
 * Example:
 *   rate_limit:192.168.1.10  →  value: 5  (TTL: 42s remaining)
 *
 * This means the user at 192.168.1.10 has made 5 requests
 * in the current window, and the window resets in 42 seconds.
 */

const redisClient = require("../services/redisClient");

// Read rate limit config from environment variables
const WINDOW_SEC = parseInt(process.env.RATE_LIMIT_WINDOW_SEC, 10) || 60;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10;

/**
 * Express middleware that enforces rate limiting.
 *
 * @param {Object} req  - Express request object
 * @param {Object} res  - Express response object
 * @param {Function} next - Call next() to pass control to the next middleware
 */
async function rateLimiter(req, res, next) {
    try {
        // -----------------------------------------------
        // STEP 1: Identify the client by IP address
        // -----------------------------------------------
        // "req.ip" gives us the client's IP. In production behind
        // a proxy/load balancer, make sure "trust proxy" is set.
        const clientIP = req.ip;
        const redisKey = `rate_limit:${clientIP}`;

        // -----------------------------------------------
        // STEP 2: Increment the request counter in Redis
        // -----------------------------------------------
        // Redis INCR atomically increments the value by 1.
        // If the key doesn't exist, Redis creates it with value 1.
        const currentCount = await redisClient.incr(redisKey);

        // -----------------------------------------------
        // STEP 3: Set expiration on FIRST request only
        // -----------------------------------------------
        // When currentCount is 1, this is the first request in a
        // new window — so we set the key to expire after WINDOW_SEC.
        if (currentCount === 1) {
            await redisClient.expire(redisKey, WINDOW_SEC);
        }

        // -----------------------------------------------
        // STEP 4: Get the remaining TTL for the reset header
        // -----------------------------------------------
        const ttl = await redisClient.ttl(redisKey);

        // Calculate how many requests the user has left
        const remaining = Math.max(0, MAX_REQUESTS - currentCount);

        // -----------------------------------------------
        // STEP 5: Set rate limit response headers
        // -----------------------------------------------
        // These headers tell the client about their rate limit status.
        res.set({
            "X-RateLimit-Limit": MAX_REQUESTS,             // Max allowed requests
            "X-RateLimit-Remaining": remaining,             // Requests left in window
            "X-RateLimit-Reset": Math.ceil(Date.now() / 1000) + ttl, // Unix timestamp when window resets
        });

        // -----------------------------------------------
        // STEP 6: Block or allow the request
        // -----------------------------------------------
        if (currentCount > MAX_REQUESTS) {
            // User has exceeded the rate limit → send 429
            return res.status(429).json({
                success: false,
                message: "Too Many Requests. Please try again later.",
                retryAfter: `${ttl} seconds`,
            });
        }

        // User is within the limit → proceed to the route handler
        next();
    } catch (error) {
        // If Redis is down, we let the request through (fail-open).
        // In production, you might want to fail-closed instead.
        console.error("⚠️  Rate limiter error:", error.message);
        next();
    }
}

module.exports = rateLimiter;
