require("dotenv").config()
require("./src/config")
const mongoose = require("mongoose")
const eventService = require("./src/services/event.service")
const express = require("express")


const app = express()
app.get("/health", (req, res) => {
  res.json({ status: "worker running", timestamp: new Date().toISOString() })
})
app.listen(process.env.WORKER_PORT || 5005, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "Worker health server started"
  }))
})

// Connect DB then start worker loop
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Worker MongoDB connected"
    }))
    startWorker()
  })
  .catch(err => console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "Worker MongoDB failed",
    error: err.message
  })))

const startWorker = async () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "Worker loop started"
  }))
  while (true) {
    await eventService.workerloop()
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}