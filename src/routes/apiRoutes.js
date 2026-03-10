/**
 * ============================================
 *  API Routes
 * ============================================
 *
 * This file defines the API endpoints for our application.
 * The rate limiter middleware is applied to protect these
 * routes from excessive requests.
 */

const express = require("express");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * GET /api/test
 *
 * A simple test endpoint protected by the rate limiter.
 * Use this to verify that rate limiting is working correctly.
 *
 * ✅ Returns 200 if within rate limit
 * ❌ Returns 429 if rate limit exceeded
 */
router.get("/test", rateLimiter, (req, res) => {
    res.status(200).json({
        success: true,
        message: "✅ API request successful!",
        data: {
            serverPort: process.env.PORT || 3000,
            timestamp: new Date().toISOString(),
            clientIP: req.ip,
        },
    });
});

module.exports = router;
