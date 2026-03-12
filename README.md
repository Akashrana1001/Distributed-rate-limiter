# Distributed Rate Limiter

A production-ready distributed rate limiter built with **Node.js**, **Express**, and **Redis**. It uses the **Fixed Window** algorithm to limit API requests per client IP, with Redis as the shared counter store so limits are enforced consistently across multiple server instances.

---

## How It Works

### Fixed Window Algorithm

1. Each time window is a fixed duration (default: **60 seconds**).
2. When a request arrives, the middleware looks up the client IP-based counter in Redis.
3. If no counter exists, one is created and set to expire after the window duration.
4. If the counter is below the limit, the request is allowed and the counter is incremented.
5. If the counter has reached the limit, the request is rejected with **HTTP 429**.

### Why Redis?

In a distributed system with multiple server instances, each server needs to share rate limit state. Redis acts as a **centralized, atomic counter store** that all instances read from and write to.

Without Redis, each server would maintain its own counter � a user could bypass the rate limit simply by spreading requests across different servers.

```
Client Request
      �
      ?
+-------------+     +-------------+
�   Server 1  �----?�             �
�  (port 3001)�     �    Redis    �  ? shared counter store
�             �     �  (port 6379)�
�   Server 2  �----?�             �
�  (port 3002)�     +-------------+
+-------------+
```

Redis key format: `rate_limit:<IP_ADDRESS>` � for example, `rate_limit:192.168.1.10` holds the request count for that IP with a TTL equal to the window duration.

---

## Project Structure

```
+-- src/
�   +-- server.js                  # Express app entry point
�   +-- middleware/
�   �   +-- rateLimiter.js         # Fixed Window rate limiter middleware
�   +-- routes/
�   �   +-- apiRoutes.js           # API route definitions
�   +-- services/
�       +-- redisClient.js         # Redis connection via ioredis
+-- Dockerfile                     # Container image for the Node.js server
+-- docker-compose.yml             # Spins up Redis + 2 server instances
+-- package.json
```

---

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose  
  **OR**  
- Node.js 18+ and a running Redis instance

---

## Getting Started

### Option 1 � Docker Compose (Recommended)

Starts **Redis** and **two Node.js server instances** with a single command:

```bash
docker-compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Server 1 | http://localhost:3001 |
| Server 2 | http://localhost:3002 |
| Redis    | localhost:6379        |

Both servers connect to the same Redis instance, so rate limits are enforced globally across both.

### Option 2 � Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure Redis is running locally on port `6379`.

3. Start the server:
   ```bash
   # Production
   npm start

   # Development (auto-restarts on file changes)
   npm run dev
   ```

The server will start on `http://localhost:3000`.

---

## API Endpoints

### `GET /api/test`

A rate-limited endpoint. Use this to verify the rate limiter is working.

**Success (200):**
```json
{
  "success": true,
  "message": "? API request successful!",
  "data": {
    "serverPort": 3000,
    "timestamp": "2026-03-12T10:00:00.000Z",
    "clientIP": "::1"
  }
}
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "message": "Too Many Requests. Please try again later.",
  "retryAfter": "42 seconds"
}
```

### `GET /health`

Health check endpoint � returns server uptime. Useful for Docker health checks and load balancers.

```json
{
  "status": "healthy",
  "uptime": 123.45
}
```

---

## Response Headers

Every request to a rate-limited endpoint includes these headers:

| Header                  | Description                                   |
|-------------------------|-----------------------------------------------|
| `X-RateLimit-Limit`     | Maximum requests allowed per window           |
| `X-RateLimit-Remaining` | Requests remaining in the current window      |
| `X-RateLimit-Reset`     | Unix timestamp when the current window resets |

---

## Configuration

All settings are controlled via environment variables:

| Variable                  | Default     | Description                               |
|---------------------------|-------------|-------------------------------------------|
| `PORT`                    | `3000`      | Port the Express server listens on        |
| `REDIS_HOST`              | `localhost` | Redis server hostname                     |
| `REDIS_PORT`              | `6379`      | Redis server port                         |
| `RATE_LIMIT_WINDOW_SEC`   | `60`        | Duration of each rate limit window (sec)  |
| `RATE_LIMIT_MAX_REQUESTS` | `10`        | Max requests allowed per window per IP    |

When using Docker Compose, these are pre-configured in `docker-compose.yml`.

---

## Testing the Rate Limiter

Send multiple rapid requests to see the limiter in action (Linux/Mac/WSL):

```bash
for i in {1..12}; do curl -i http://localhost:3001/api/test; done
```

- Requests 1�10: `200 OK`
- Requests 11+: `429 Too Many Requests`

**Test distributed enforcement** by alternating between both servers. Because they share Redis, the combined request count is tracked against the same IP:

```bash
curl http://localhost:3001/api/test
curl http://localhost:3002/api/test  # counts against the same IP limit
```

---

## Tech Stack

| Technology | Role                            |
|------------|---------------------------------|
| Node.js 18 | Runtime                         |
| Express 4  | HTTP server and routing         |
| Redis 7    | Distributed counter store       |
| ioredis 5  | Redis client for Node.js        |
| Docker     | Containerization                |
| dotenv     | Environment variable management |

---

## License

MIT
