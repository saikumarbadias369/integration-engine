require("dotenv").config()
require("./src/config")
const logger = require("./src/utils/logger")
const mongoose = require("mongoose")
const express = require("express")
const { Worker } = require("bullmq")
const { connection, QUEUE_NAMES } = require("./src/config/queue.config")
const eventService = require("./src/services/event.service")
const { sendSlackAlert } = require("./src/utils/slack")

const app = express()

app.get("/health", (req, res) => {
  res.json({ status: "worker running", timestamp: new Date().toISOString() })
})

app.listen(process.env.WORKER_PORT || 5005, () => {
  logger.info({ event: "Worker health server started", port: process.env.WORKER_PORT || 5005 })
})

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    logger.info({ event: "Worker MongoDB connected" })
    startWorker()
  })
  .catch(err => {
    logger.error({ event: "Worker MongoDB failed", error: err.message })
  })

const startWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.WEBHOOK_EVENTS,
    async (job) => {
      const { eventId, type, payload } = job.data

      logger.info({
        event: "Processing job",
        eventId,
        type,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts?.attempts ?? 3
      })

      await eventService.updateStatus(eventId, "processing")
      await eventService.processEvent({ eventId, type, payload, retryCount: job.attemptsMade })
      await eventService.updateStatus(eventId, "processed")

      logger.info({ event: "Job processed", eventId, attempt: job.attemptsMade + 1 })
    },
    { connection, concurrency: 3 }
  )

  worker.on("completed", (job) => {
    logger.info({ event: "Job completed", jobId: job.id, eventId: job.data.eventId })
  })

  worker.on("failed", async (job, error) => {
    const maxAttempts = job.opts?.attempts ?? 3
    const isLastAttempt = job.attemptsMade >= maxAttempts

    logger.error({
      event: "Job failed",
      jobId: job.id,
      eventId: job.data?.eventId,
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade,
      maxAttempts,
      willRetry: !isLastAttempt
    })

    if (job.data?.eventId) {
      if (isLastAttempt) {
        await eventService.updateStatus(job.data.eventId, "dead")
        await sendSlackAlert(
          `🚨 *DEAD JOB ALERT*\n` +
          `*Event ID:* ${job.data.eventId}\n` +
          `*Type:* ${job.data.type}\n` +
          `*Error:* ${error.message}\n` +
          `*Total Attempts:* ${job.attemptsMade}\n` +
          `*Time:* ${new Date().toISOString()}`
        )
      } else {
        await eventService.updateStatus(job.data.eventId, "failed")
      }
    }
  })

  // Separate from job failure — fires when worker process itself has a problem
  worker.on("error", (error) => {
    logger.error({ event: "Worker error", error: error.message })
  })

  logger.info({ event: "BullMQ Worker started", queue: QUEUE_NAMES.WEBHOOK_EVENTS, concurrency: 3 })
}