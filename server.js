require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const webhookRoutes = require("./src/routes/webhook.routes")
const oauthRoutes = require("./src/routes/oauth.routes")

const app = express()
app.use(express.json())

// Logs every request with method, path, status, response time
app.use((req, res, next) => {
  const start = Date.now()
  res.on("finish", () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    }))
  })
  next()
})



// Catches malformed JSON body
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ success: false, error: "Invalid JSON" })
  }
  next()
})

// Checks DB connection — returns 503 if unhealthy so Railway auto-restarts
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: dbStatus
  })
})

app.use("/oauth", oauthRoutes)
app.use("/webhook", webhookRoutes)

app.get("/", (req, res) => {
  res.json({ message: "Integration Engine Running" })
})

// Catches all unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" })
})

// Catches any unexpected errors — prevents server crash
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: err.message,
    path: req.path
  }))
  res.status(500).json({ success: false, error: "Internal server error" })
})

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: "MongoDB connected" })))
  .catch(err => console.error(JSON.stringify({ timestamp: new Date().toISOString(), event: "MongoDB connection failed", error: err.message })))

const PORT = process.env.PORT || 5004
app.listen(PORT, () => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: "Server started", port: PORT }))
})