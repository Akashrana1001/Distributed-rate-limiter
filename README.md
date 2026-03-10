# 🚦 Distributed Rate Limiter

A beginner-friendly, production-style **Distributed Rate Limiter** built with **Node.js**, **Express**, **Redis**, and **Docker**.

This project demonstrates how to limit API requests **across multiple server instances** using Redis as a shared datastore — a core concept in system design interviews.

---

## 📖 Table of Contents

1. [What is Rate Limiting?](#-what-is-rate-limiting)
2. [What is Distributed Rate Limiting?](#-what-is-distributed-rate-limiting)
3. [Why Redis?](#-why-redis)
4. [Fixed Window Algorithm](#-fixed-window-algorithm)
5. [Architecture Diagram](#-architecture-diagram)
6. [Project Structure](#-project-structure)
7. [How to Run](#-how-to-run)
8. [API Reference](#-api-reference)
9. [Testing the Rate Limiter](#-testing-the-rate-limiter)
10. [Environment Variables](#-environment-variables)

---

## 🔒 What is Rate Limiting?

**Rate limiting** is a technique to control how many requests a client can make to an API within a given time period.

**Why is it important?**

- 🛡️ **Prevents abuse** — Stops malicious users from overloading your server
- 💰 **Saves resources** — Protects your server from running out of memory/CPU
- ⚖️ **Fair usage** — Ensures all users get equal access to the API
- 🔐 **Security** — Helps prevent brute-force attacks

**Example:** Allow each user a maximum of **10 requests per minute**.

---

## 🌐 What is Distributed Rate Limiting?

In real-world applications, you don't run just one server — you run **multiple instances** behind a load balancer.

**The Problem:**  
If each server tracks rate limits independently, a user can simply send requests to different servers to bypass the limit.

**The Solution:**  
Use a **centralized datastore** (Redis) that all servers share. Every server reads and writes rate limit counters to the **same Redis instance**, so limits are enforced **globally**.

```
Without Redis (broken):                With Redis (correct):
┌──────────┐  5 reqs   ┌──────────┐   ┌──────────┐  5 reqs   ┌──────────┐
│  Client  │──────────▶│ Server 1 │   │  Client  │──────────▶│ Server 1 │──┐
│          │  5 reqs   │ count: 5 │   │          │  5 reqs   │          │  │
│          │──────────▶│ Server 2 │   │          │──────────▶│ Server 2 │──┤
│          │           │ count: 5 │   │          │           │          │  │
└──────────┘           └──────────┘   └──────────┘           └──────────┘  │
                                                                           │
User made 10 total,                                           ┌──────────┐ │
but each server only                                          │  Redis   │◀┘
counted 5 → NOT blocked!                                      │ count:10 │
                                                              └──────────┘
                                                              Total = 10 → BLOCKED!
```

---

## 🗄️ Why Redis?

| Feature | Why it matters |
|---------|---------------|
| **In-memory** | Extremely fast reads/writes (sub-millisecond) |
| **Atomic operations** | `INCR` command is atomic — no race conditions |
| **TTL (expiration)** | Keys auto-expire, so counters reset automatically |
| **Shared state** | Multiple servers can read/write the same data |
| **Simple** | No complex setup — perfect for rate limiting |

---

## ⏱️ Fixed Window Algorithm

The **Fixed Window** algorithm is the simplest rate limiting approach:

```
Timeline (1-minute windows):

Window 1               Window 2               Window 3
├───────────────────────├───────────────────────├─────────────
│ Req1 Req2 ... Req10  │ Req1 Req2 ...        │
│ ✅   ✅        ✅   │ ✅   ✅              │
│ Req11 → ❌ 429!     │                       │
│ Counter resets ──────▶│ Counter = 0           │
```

**How it works in code:**

1. A request arrives → build the key: `rate_limit:<IP>`
2. Run `INCR` on the key (atomically increment by 1)
3. If it's the first request (`count === 1`), set `EXPIRE` to 60 seconds
4. If `count > 10` → return **HTTP 429**
5. Otherwise → allow the request

---

## 🏗️ Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │              Docker Network              │
                    │                                          │
  ┌──────────┐     │  ┌──────────────┐    ┌──────────────┐   │
  │          │     │  │   Server 1   │    │   Server 2   │   │
  │  Client  │─────┤  │  (port 3001) │    │  (port 3002) │   │
  │ (Browser │     │  │              │    │              │   │
  │  / curl) │     │  │  Express +   │    │  Express +   │   │
  │          │     │  │  Rate Limiter│    │  Rate Limiter│   │
  └──────────┘     │  └──────┬───────┘    └──────┬───────┘   │
                    │         │                    │           │
                    │         └────────┬───────────┘           │
                    │                  │                        │
                    │         ┌────────▼────────┐              │
                    │         │     Redis       │              │
                    │         │   (port 6379)   │              │
                    │         │                 │              │
                    │         │  rate_limit:IP  │              │
                    │         │  = request count│              │
                    │         └─────────────────┘              │
                    └─────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
distributed-rate-limiter/
│
├── src/
│   ├── middleware/
│   │   └── rateLimiter.js      # Rate limiting middleware (Fixed Window)
│   │
│   ├── services/
│   │   └── redisClient.js      # Redis connection setup
│   │
│   ├── routes/
│   │   └── apiRoutes.js        # API route definitions
│   │
│   └── server.js               # Express app entry point
│
├── docker-compose.yml           # Runs Redis + 2 Node servers
├── Dockerfile                   # Container image for Node app
├── package.json                 # Dependencies and scripts
├── .env                         # Environment variables
├── .dockerignore                # Files to exclude from Docker image
└── README.md                    # You are here!
```

---

## 🚀 How to Run

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

### Steps

**1. Clone the repository:**

```bash
git clone <your-repo-url>
cd distributed-rate-limiter
```

**2. Start the entire system with Docker Compose:**

```bash
docker-compose up --build
```

This will start:

| Service | Container | Port |
|---------|-----------|------|
| Redis | rate-limiter-redis | 6379 |
| Server 1 | rate-limiter-server1 | 3001 |
| Server 2 | rate-limiter-server2 | 3002 |

**3. Test the API:**

```bash
curl http://localhost:3001/api/test
```

**4. Stop everything:**

```bash
docker-compose down
```

---

## 📡 API Reference

### `GET /api/test`

A test endpoint protected by the rate limiter.

**Success Response (HTTP 200):**

```json
{
  "success": true,
  "message": "✅ API request successful!",
  "data": {
    "serverPort": "3000",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "clientIP": "172.18.0.1"
  }
}
```

**Rate Limit Exceeded (HTTP 429):**

```json
{
  "success": false,
  "message": "Too Many Requests. Please try again later.",
  "retryAfter": "45 seconds"
}
```

**Response Headers:**

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Max requests per window | `10` |
| `X-RateLimit-Remaining` | Requests left in window | `7` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1705312200` |

### `GET /health`

Health check endpoint (not rate limited).

```json
{
  "status": "healthy",
  "uptime": 120.45
}
```

---

## 🧪 Testing the Rate Limiter

### Using curl (Linux/Mac)

Send 11 requests rapidly to see the rate limiter in action:

```bash
for i in $(seq 1 11); do
  echo "Request $i:"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/api/test
done
```

### Using PowerShell (Windows)

```powershell
for ($i = 1; $i -le 11; $i++) {
  Write-Host "Request $i :" -NoNewline
  $response = Invoke-WebRequest -Uri http://localhost:3001/api/test -UseBasicParsing -ErrorAction SilentlyContinue
  Write-Host " HTTP $($response.StatusCode)"
}
```

### Expected Output

```
Request 1:  HTTP 200   ← ✅ Allowed
Request 2:  HTTP 200   ← ✅ Allowed
...
Request 10: HTTP 200   ← ✅ Allowed (last one!)
Request 11: HTTP 429   ← ❌ Blocked! Too Many Requests
```

### Test Distributed Behavior

After hitting the limit on **Server 1** (port 3001), immediately try **Server 2** (port 3002):

```bash
curl http://localhost:3002/api/test
# → Also returns 429! Proves rate limit is shared via Redis.
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Time window in seconds |
| `RATE_LIMIT_MAX_REQUESTS` | `10` | Max requests per window |

---

## 📝 License

MIT

---

## ⭐ Interview Talking Points

When explaining this project in an interview, highlight:

1. **Why distributed?** — Single-server rate limiting breaks with multiple instances
2. **Why Redis?** — Atomic operations, TTL support, shared state
3. **Algorithm choice** — Fixed Window is simple; mention Sliding Window and Token Bucket as alternatives
4. **Race conditions** — Redis `INCR` is atomic, preventing race conditions
5. **Fail-open vs Fail-closed** — Currently fails open (allows requests if Redis is down)
6. **Docker** — Demonstrates understanding of containerization and multi-service orchestration
