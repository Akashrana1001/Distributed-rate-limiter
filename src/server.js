/**
 * ============================================
 *  Distributed Rate Limiter — Express Server
 * ============================================
 *
 * This is the entry point of the application.
 * It loads environment variables, sets up Express,
 * mounts the API routes, and starts the server.
 */

// Load environment variables from .env file
// (In Docker, these are passed via docker-compose.yml)
require("dotenv").config();

const express = require("express");
const apiRoutes = require("./routes/apiRoutes");

// Create the Express application
const app = express();

// --------------------------------------------------
// Trust proxy — important when running behind Docker,
// Nginx, or a load balancer so that req.ip returns
// the real client IP instead of the proxy's IP.
// --------------------------------------------------
app.set("trust proxy", true);

// Parse JSON request bodies (if needed in future routes)
app.use(express.json());

// --------------------------------------------------
// Health check endpoint (useful for Docker health checks)
// --------------------------------------------------
app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", uptime: process.uptime() });
});

// --------------------------------------------------
// Mount API routes at /api
// --------------------------------------------------
app.use("/api", apiRoutes);

// --------------------------------------------------
// Start the server
// --------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🚀  Rate Limiter Server is running!        ║
  ║   📡  Port: ${PORT}                             ║
  ║   🔗  http://localhost:${PORT}/api/test          ║
  ╚══════════════════════════════════════════════╝
  `);
});
