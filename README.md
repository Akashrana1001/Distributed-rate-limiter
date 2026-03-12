# 🚀 Backend Task Queue

A **distributed task queue system** built with **Node.js**, **Express**, **Redis**, and **BullMQ** for processing background jobs asynchronously.

This project demonstrates understanding of asynchronous processing, background workers, queue systems, Redis usage, and scalable backend architecture.

---

## Tech Stack

**Backend:** Node.js, Express  
**Queue Library:** BullMQ  
**Caching Layer:** Redis  
**Containerization:** Docker, Docker Compose  
**Language:** JavaScript

---

## Key Features

- Distributed background job processing across multiple workers
- Redis-backed queue with persistent job state using BullMQ
- Priority queue with high, medium, and low priority levels
- Automatic retries with exponential backoff on job failure
- Delayed job scheduling — run jobs after a specified time
- Full job lifecycle tracking: `waiting → active → completed / failed`
- Dockerized multi-service architecture for consistent environments

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Example API Requests](#example-api-requests)
- [Priority Queue](#priority-queue)
- [Automatic Retries](#automatic-retries)
- [Delayed Jobs](#delayed-jobs)
- [Job States](#job-states)
- [Performance Testing](#performance-testing)
- [Failure Handling](#failure-handling)
- [Scalability](#scalability)
- [Future Improvements](#future-improvements)
- [Demo](#demo)
- [Technologies Used](#technologies-used)
- [Author](#author)

---

## Overview

This project implements a **background job processing system** where:

1. A **REST API** accepts job requests from clients
2. Jobs are stored in a **Redis-backed queue** using BullMQ
3. A separate **worker process** picks up jobs and processes them in the background
4. Clients can check **job status** at any time

### Why is this useful?

In real-world applications, some tasks take a long time to complete (sending emails, processing images, generating reports). Instead of making users wait, these tasks are pushed to a **background queue** and processed asynchronously.

---

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP    │              │  Push   │              │
│    Client    │ ──────>  │   Express    │ ──────> │    Redis     │
│  (Browser /  │ <──────  │   API Server │         │    Queue     │
│   curl)      │  JSON    │  (server.js) │         │              │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                         │ Pull
                                                         ▼
                                                  ┌──────────────┐
                                                  │              │
                                                  │   Worker     │
                                                  │  Process     │
                                                  │ (jobWorker)  │
                                                  │              │
                                                  └──────────────┘
```

**How it works:**
1. Client sends a POST request to add a job (e.g., send email)
2. The API server pushes the job into the Redis queue
3. The worker process (running separately) picks up the job
4. The worker processes the job and updates its status in Redis
5. Client can query the job status at any time via GET request

---

## Features

| Feature | Description |
|---------|-------------|
| **Job Queue** | Redis-backed queue using BullMQ |
| **REST API** | Express endpoints to add and monitor jobs |
| **Priority Queue** | High, medium, low priority levels |
| **Automatic Retries** | Failed jobs retry up to 3 times with exponential backoff |
| **Delayed Jobs** | Schedule jobs to run after a specified delay |
| **Job Status Tracking** | Track jobs through waiting → active → completed/failed |
| **Background Workers** | Separate worker process for job execution |
| **Colored Logging** | Console logs with timestamps and colors |
| **Docker Support** | Docker Compose file for Redis |

---

## Project Structure

```
backend-task-queue/
├── server.js                 # Express API server (entry point)
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── .env.example              # Template for environment variables
├── docker-compose.yml        # Docker setup for Redis
│
├── queue/
│   ├── redisConnection.js    # Shared Redis connection config
│   └── jobQueue.js           # BullMQ queue setup & job helpers
│
├── workers/
│   └── jobWorker.js          # Background worker process
│
├── jobs/
│   ├── emailJob.js           # Email job handler (simulated)
│   └── imageJob.js           # Image processing handler (simulated)
│
├── routes/
│   └── jobRoutes.js          # API route definitions
│
├── controllers/
│   └── jobController.js      # Request handlers (business logic)
│
└── utils/
    └── logger.js             # Colored console logger
```

---

## Setup Instructions

### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Redis** - Either via Docker or installed locally
- **Docker** (optional) - [Download](https://www.docker.com/)

### 1. Clone and Install

```bash
# Navigate to the project directory
cd backend-task-queue

# Install dependencies
npm install
```

### 2. Start Redis

**Option A: Using Docker (recommended)**

```bash
docker-compose up -d
```

**Option B: Local Redis**

If you have Redis installed locally, just make sure it's running:

```bash
# On Linux/Mac
redis-server

# On Windows (via WSL or Redis for Windows)
redis-server
```

### 3. Configure Environment

The default `.env` file works out of the box for local development:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Running the Project

You need **two terminal windows** — one for the API server and one for the worker.

### Terminal 1: Start the API Server

```bash
npm start
```

You should see:
```
[SUCCESS] 🚀 Server running on http://localhost:3000
[INFO]    Health check: http://localhost:3000/health
[INFO]    Job routes:   http://localhost:3000/jobs
```

### Terminal 2: Start the Worker

```bash
npm run worker
```

You should see:
```
[SUCCESS] 🚀 Worker started and listening for jobs...
[INFO]    Queue: task-queue
[INFO]    Concurrency: 1
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs/email` | Add an email job to the queue |
| `POST` | `/jobs/image` | Add an image processing job |
| `GET` | `/jobs/:id` | Get status of a specific job |
| `GET` | `/jobs` | List all recent jobs |
| `GET` | `/health` | Health check endpoint |

---

## Example API Requests

### 1. Add an Email Job

```bash
curl -X POST http://localhost:3000/jobs/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome!",
    "body": "Thanks for signing up!",
    "priority": "high"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Email job added to queue",
  "data": {
    "jobId": "1",
    "type": "email",
    "priority": "high",
    "delay": 0,
    "status": "waiting"
  }
}
```

### 2. Add an Image Processing Job with Delay

```bash
curl -X POST http://localhost:3000/jobs/image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/photo.jpg",
    "priority": "low",
    "delay": 10000
  }'
```

### 3. Check Job Status

```bash
curl http://localhost:3000/jobs/1
```

**Response (completed job):**
```json
{
  "success": true,
  "data": {
    "jobId": "1",
    "type": "email",
    "state": "completed",
    "progress": 100,
    "data": {
      "to": "user@example.com",
      "subject": "Welcome!",
      "body": "Thanks for signing up!"
    },
    "attempts": 1,
    "maxAttempts": 3,
    "result": {
      "status": "sent",
      "to": "user@example.com",
      "subject": "Welcome!",
      "sentAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 4. List All Recent Jobs

```bash
curl http://localhost:3000/jobs
```

```bash
# With custom limit
curl http://localhost:3000/jobs?limit=5
```

---

## Priority Queue

Jobs support three priority levels. Higher priority jobs are processed before lower ones.

| Priority | Numeric Value | Description |
|----------|--------------|-------------|
| `high` | 1 | Processed first |
| `medium` | 5 | Default priority |
| `low` | 10 | Processed last |

**Example:** If you add a `low` priority job and then a `high` priority job, the `high` priority job will be processed first.

```bash
# This will be processed SECOND
curl -X POST http://localhost:3000/jobs/email \
  -H "Content-Type: application/json" \
  -d '{"to": "a@test.com", "subject": "Low", "body": "...", "priority": "low"}'

# This will be processed FIRST
curl -X POST http://localhost:3000/jobs/email \
  -H "Content-Type: application/json" \
  -d '{"to": "b@test.com", "subject": "High", "body": "...", "priority": "high"}'
```

---

## Automatic Retries

If a job fails (throws an error), BullMQ automatically retries it up to **3 times** using **exponential backoff**:

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1st retry | 2 seconds |
| 2nd retry | 4 seconds |
| 3rd retry | 8 seconds |

After all 3 retries are exhausted, the job is marked as **failed**.

The demo jobs randomly fail ~10% of the time so you can see retries in action in the worker logs.

---

## Delayed Jobs

You can schedule a job to start processing after a delay by passing the `delay` parameter (in milliseconds).

```bash
# This job will start processing after 10 seconds
curl -X POST http://localhost:3000/jobs/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Reminder",
    "body": "Don't forget your meeting!",
    "delay": 10000
  }'
```

The job will be in `delayed` state until the delay expires, then it moves to `waiting` and gets processed normally.

---

## Job States

Each job goes through a lifecycle of states:

```
  ┌─────────┐     ┌────────┐     ┌───────────┐
  │ delayed  │ ──> │waiting │ ──> │  active   │
  └─────────┘     └────────┘     └─────┬─────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                       ┌───────────┐     ┌──────────┐
                       │ completed │     │  failed   │
                       └───────────┘     └──────────┘
                                               │
                                               ▼ (retry)
                                         ┌──────────┐
                                         │ waiting  │
                                         └──────────┘
```

| State | Description |
|-------|-------------|
| `delayed` | Job is waiting for its delay timer to expire |
| `waiting` | Job is in the queue, ready to be picked up |
| `active` | Job is currently being processed by a worker |
| `completed` | Job finished successfully |
| `failed` | Job failed after all retry attempts |

---

## Performance Testing

Load testing performed using [k6](https://k6.io/).

### Test Setup

| Parameter | Value |
|-----------|-------|
| Virtual Users | 50 |
| Duration | 30 seconds |
| Target Endpoint | `POST /jobs/email` |

### Results

| Metric | Value |
|--------|-------|
| Average Latency | _(add your result here)_ |
| Requests per Second | _(add your result here)_ |
| Error Rate | _(add your result here)_ |

> **Screenshot:** _(add a screenshot of your k6 terminal output here)_

---

## Failure Handling

- If **Redis is unavailable**, the system fails open and allows requests through to prevent a hard outage.
- **Timeout protection** is applied on Redis operations to prevent the API from blocking indefinitely.
- **Rate limiting logic is stateless** on server instances — all state is stored in Redis, making individual servers replaceable.
- Failed jobs are **automatically retried** up to 3 times with exponential backoff before being marked as failed.

---

## Scalability

The system scales horizontally by adding more API server instances behind a load balancer.  
All instances share the same **Redis-backed job queue**, ensuring global coordination across distributed nodes.

```
         ┌─────────────────────────────────┐
         │          Load Balancer          │
         └──────────┬───────────┬──────────┘
                    │           │
             ┌──────▼───┐ ┌────▼──────┐
             │ API Node │ │ API Node  │
             │    #1    │ │    #2     │
             └──────┬───┘ └────┬──────┘
                    │          │
             ┌──────▼──────────▼──────┐
             │      Redis Queue       │
             │  (shared state store)  │
             └────────────┬───────────┘
                          │
             ┌────────────▼───────────┐
             │   Worker Pool          │
             │  (scales independently)│
             └────────────────────────┘
```

---

## Future Improvements

- [ ] Implement **Sliding Window** rate limiting algorithm
- [ ] Implement **Token Bucket** algorithm
- [ ] Add **Redis Cluster** support for high availability
- [ ] Add **Prometheus + Grafana** monitoring dashboard
- [ ] Add **Kubernetes** deployment manifests
- [ ] Add **dead-letter queue** for jobs that exceed all retries
- [ ] Build a **Web UI** for real-time job monitoring

---

## Demo

> **GIF/Screenshot:** _(replace this line with your demo GIF or screenshot)_
>
> Suggested recording:
> - Submit several job requests via `curl` or a REST client
> - Show jobs progressing through `waiting → active → completed` in worker logs
> - Demonstrate an automatic retry when a job fails

---

## Technologies Used

| Technology | Purpose |
|------------|--------|
| **Node.js** | Runtime environment |
| **Express.js** | REST API framework |
| **BullMQ** | Job queue library |
| **Redis** | In-memory store for queue data |
| **IORedis** | Redis client for Node.js |
| **dotenv** | Environment variable management |
| **Docker** | Containerized Redis setup |

---

## 📝 License

MIT

---

## Author

**Akash Chauhan**  
GitHub: [github.com/Akashrana1001](https://github.com/Akashrana1001)  
LinkedIn: [linkedin.com/in/akashrana100](https://linkedin.com/in/akashrana100)
