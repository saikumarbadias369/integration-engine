require("dotenv").config()
require("./src/config")

const mongoose = require("mongoose")
const express = require("express")
const { Worker } = require("bullmq")
const { connection, QUEUE_NAMES } = require("./src/config/queue.config")
const eventService = require("./src/services/event.service")
const { sendSlackAlert } = require("./src/utils/slack")

// ── Health server ──────────────────────────────────────────────────────────
const app = express()

app.get("/health", (req, res) => {
  res.json({
    status: "worker running",
    timestamp: new Date().toISOString()
  })
})

app.listen(process.env.WORKER_PORT || 5005, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "Worker health server started",
    port: process.env.WORKER_PORT || 5005
  }))
})

// ── Connect MongoDB then start worker ──────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Worker MongoDB connected"
    }))
    startWorker()
  })
  .catch(err => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Worker MongoDB failed",
      error: err.message
    }))
  })


const startWorker = () => {

  // ── BullMQ Worker ────────────────────────────────────────────────────────

  // BullMQ calls this function automatically when a new job arrives

  const worker = new Worker(
    // Which queue to listen to
    QUEUE_NAMES.WEBHOOK_EVENTS,

    // Job processor function
    // BullMQ calls this for every job in the queue
    // job.data = what you passed in queueService.addWebhookEvent()
    async (job) => {
      const { eventId, type, payload } = job.data

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "Processing job from BullMQ",
        eventId,
        type,
        // attemptsMade = how many times this job has been tried
        // BullMQ tracks this automatically — no manual retryCount needed
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts?.attempts ?? 3
      }))

      // Update MongoDB status to processing
      await eventService.updateStatus(eventId, "processing")

      // Process the event — calls HubSpot CRM
      // If this throws an error:
      // BullMQ catches it automatically
      // Waits for backoff delay
      // Retries up to max attempts
      // No manual retry code needed anymore
      await eventService.processEvent({
        eventId,
        type,
        payload,
        retryCount: job.attemptsMade
      })

      // Update MongoDB status to processed
      await eventService.updateStatus(eventId, "processed")

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "Job processed successfully",
        eventId,
        attempt: job.attemptsMade + 1
      }))
    },

    {
      connection,
      // Process up to 3 jobs at the same time
      // Same as your old processInBatches(events, concurrency=3)
      concurrency: 3
    }
  )

  // ── Job completed successfully ───────────────────────────────────────────
  worker.on("completed", (job) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Job completed",
      jobId: job.id,
      eventId: job.data.eventId
    }))
  })

  // ── Job failed on this attempt ───────────────────────────────────────────
  // This fires after EVERY failed attempt — not just the last one
  // BullMQ automatically retries based on your attempts + backoff config
  worker.on("failed", async (job, error) => {
    const maxAttempts = job.opts?.attempts ?? 3
    const isLastAttempt = job.attemptsMade >= maxAttempts

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Job attempt failed",
      jobId: job.id,
      eventId: job.data?.eventId,
      error: error.message,
      attempt: job.attemptsMade,
      maxAttempts:maxAttempts,
      // Tell us clearly if BullMQ will retry or give up
      willRetry: !isLastAttempt
    }))

    // Update MongoDB status — failed if will retry, dead if last attempt
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

  // ── Worker itself has an error ───────────────────────────────────────────
  // Different from job failure — this is the worker process having a problem
  // Example: Redis connection drops
  worker.on("error", (error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Worker error",
      error: error.message
    }))
  })

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "BullMQ Worker started",
    queue: QUEUE_NAMES.WEBHOOK_EVENTS,
    concurrency: 3
  }))
}