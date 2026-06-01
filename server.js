require("dotenv").config()
require("./src/config")
const logger = require("./src/utils/logger")
const queueService = require("./src/services/queue.service")
const express = require("express")
const mongoose = require("mongoose")
const webhookRoutes = require("./src/routes/webhook.routes")
const oauthRoutes = require("./src/routes/oauth.routes")

const app = express()
app.use(express.json())

// Log every request with method, path, status, response time
app.use((req, res, next) => {
  const start = Date.now()
  res.on("finish", () => {
    logger.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start
    })
  })
  next()
})

// Handle malformed JSON body
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ success: false, error: "Invalid JSON" })
  }
  next()
})

app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"

  let queueStats = null
  try {
    queueStats = await queueService.getQueueStats()
  } catch (err) {
    queueStats = { error: "Redis unavailable" }
  }

  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: dbStatus,
    queue: queueStats
  })
})

app.use("/oauth", oauthRoutes)
app.use("/webhook", webhookRoutes)

app.get("/", (req, res) => {
  res.json({ message: "Integration Engine Running" })
})

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" })
})

// Catch unexpected errors — prevents server crash
app.use((err, req, res, next) => {
  logger.error({ error: err.message, path: req.path })
  res.status(500).json({ success: false, error: "Internal server error" })
})

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => logger.info({ event: "MongoDB connected" }))
  .catch(err => logger.error({ event: "MongoDB connection failed", error: err.message }))

const PORT = process.env.PORT || 5004
app.listen(PORT, () => {
  logger.info({ event: "Server started", port: PORT })
})