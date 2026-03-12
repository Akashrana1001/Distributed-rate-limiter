# Distributed Rate Limiter

![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

> A production-ready **distributed rate limiter** built with Node.js, Express, and Redis. Enforces per-IP API rate limits across multiple server instances using the **Fixed Window** algorithm and Redis as a shared atomic counter store.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Response Headers](#response-headers)
- [Configuration](#configuration)
- [Testing the Rate Limiter](#testing-the-rate-limiter)
- [Tech Stack](#tech-stack)

---

## How It Works

### Fixed Window Algorithm

| Step | What Happens |
|------|-------------|
| 1 | A request arrives — the middleware reads the client IP |
| 2 | Redis is queried for the counter at key `rate_limit:<IP>` |
| 3 | If the key does not exist, it is created with value `1` and a TTL equal to the window size |
| 4 | If the counter is **below** the limit, the request is **allowed** and the counter is incremented |
| 5 | If the counter **exceeds** the limit, the request is **rejected** with `HTTP 429` |

### Why Redis for Rate Limiting?

Without a shared store, each server instance would track its own counter. A user could bypass the limit by spreading requests across different servers.

Redis solves this by acting as a **single source of truth** — all server instances atomically increment and check the same counter using Redis' native `INCR` command, which is thread-safe and atomic by design.

---

## Architecture

```
                        +------------------+
  Client (any IP)  -->  |   Load Balancer  |
                        +--------+---------+
                                 |
               +-----------------+-----------------+
               |                                   |
    +----------v----------+           +------------v--------+
    |      Server 1       |           |      Server 2       |
    |    (port 3001)      |           |    (port 3002)      |
    |                     |           |                     |
    |  rateLimiter.js     |           |  rateLimiter.js     |
    +----------+----------+           +----------+----------+
               |                                 |
               +----------------+----------------+
                                |
                    +-----------v-----------+
                    |         Redis         |
                    |  rate_limit:<IP> = N  |
                    |  (TTL: window sec)    |
                    +-----------------------+
```

Both servers share the **same Redis instance**, so the combined request count across all instances is enforced against a single limit per IP.

**Redis key format:**
```
rate_limit:192.168.1.10  -->  value: 7  (TTL: 23s remaining)
```

---

## Project Structure

```
distributed-rate-limiter/
|-- src/
|   |-- server.js                  # Express app entry point
|   |-- middleware/
|   |   `-- rateLimiter.js         # Fixed Window rate limiting logic
|   |-- routes/
|   |   `-- apiRoutes.js           # API route definitions
|   `-- services/
|       `-- redisClient.js         # ioredis connection + retry logic
|-- Dockerfile                     # Node.js container image
|-- docker-compose.yml             # Redis + 2 server instances
`-- package.json
```

---

## Prerequisites

- **[Docker](https://www.docker.com/) + Docker Compose** *(recommended)*
- **OR** Node.js 18+ with a Redis instance running locally

---

## Getting Started

### Option 1 — Docker Compose *(Recommended)*

Spins up **Redis + two Node.js instances** with a single command:

```bash
docker-compose up --build
```

| Container | Exposed URL           |
|-----------|-----------------------|
| Server 1  | http://localhost:3001 |
| Server 2  | http://localhost:3002 |
| Redis     | localhost:6379        |

Both servers connect to the same Redis container — rate limits are enforced globally.

### Option 2 — Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Ensure Redis is running on localhost:6379

# 3. Start in production mode
npm start

# OR start in dev mode (auto-restart on file changes)
npm run dev
```

Server starts at **http://localhost:3000**.

---

## API Endpoints

### `GET /api/test` — Rate-Limited Endpoint

Use this to verify that rate limiting is working correctly.

**Success `200`**
```json
{
  "success": true,
  "message": "API request successful!",
  "data": {
    "serverPort": 3000,
    "timestamp": "2026-03-12T10:00:00.000Z",
    "clientIP": "::1"
  }
}
```

**Rate Limit Exceeded `429`**
```json
{
  "success": false,
  "message": "Too Many Requests. Please try again later.",
  "retryAfter": "42 seconds"
}
```

---

### `GET /health` — Health Check

Returns server status and uptime. Useful for Docker health checks and load balancers.

```json
{
  "status": "healthy",
  "uptime": 123.45
}
```

---

## Response Headers

Every response from a rate-limited route includes these headers:

| Header                  | Description                                   |
|-------------------------|-----------------------------------------------|
| `X-RateLimit-Limit`     | Maximum requests allowed per window           |
| `X-RateLimit-Remaining` | Requests remaining in the current window      |
| `X-RateLimit-Reset`     | Unix timestamp when the current window resets |

---

## Configuration

All settings are passed via environment variables (pre-configured in `docker-compose.yml`):

| Variable                  | Default     | Description                              |
|---------------------------|-------------|------------------------------------------|
| `PORT`                    | `3000`      | Port the Express server listens on       |
| `REDIS_HOST`              | `localhost` | Redis hostname                           |
| `REDIS_PORT`              | `6379`      | Redis port                               |
| `RATE_LIMIT_WINDOW_SEC`   | `60`        | Window duration in seconds               |
| `RATE_LIMIT_MAX_REQUESTS` | `10`        | Max requests per IP per window           |

To override when running locally, create a `.env` file in the project root:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_WINDOW_SEC=60
RATE_LIMIT_MAX_REQUESTS=10
```

---

## Testing the Rate Limiter

### Hit the limit on a single server

```bash
# Send 12 requests — first 10 pass, last 2 get 429
for i in {1..12}; do
  curl -s -o /dev/null -w "Request %d: HTTP %{response_code}\n" http://localhost:3001/api/test
done
```

Expected output:
```
Request 1:  HTTP 200
...
Request 10: HTTP 200
Request 11: HTTP 429
Request 12: HTTP 429
```

### Verify distributed enforcement across both servers

Because both servers share Redis, the **combined** request count triggers the limit:

```bash
# 5 requests to Server 1
for i in {1..5}; do curl -s -o /dev/null -w "S1 req %d: HTTP %{response_code}\n" http://localhost:3001/api/test; done

# 7 more to Server 2 — will hit 429 after 5 more (total = 10)
for i in {1..7}; do curl -s -o /dev/null -w "S2 req %d: HTTP %{response_code}\n" http://localhost:3002/api/test; done
```

### Inspect rate limit headers

```bash
curl -i http://localhost:3001/api/test
```

Look for:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1741776060
```

---

## Tech Stack

| Technology      | Version | Role                                  |
|-----------------|---------|---------------------------------------|
| Node.js         | 18      | JavaScript runtime                    |
| Express         | 4       | HTTP server and routing               |
| Redis           | 7       | Distributed atomic counter store      |
| ioredis         | 5       | Redis client with built-in retry      |
| Docker          | —       | Containerization                      |
| Docker Compose  | —       | Multi-container orchestration         |
| dotenv          | 16      | Environment variable loading          |

---

## License

[MIT](https://opensource.org/licenses/MIT)
