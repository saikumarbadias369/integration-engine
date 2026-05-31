const { Queue } = require("bullmq")
const { connection, QUEUE_NAMES } = require("../config/queue.config")

// Create the main queue instance
// This connects to Redis and creates the queue if it doesn't exist
// Think of this like creating a MongoDB collection — done once, reused everywhere
const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_EVENTS, {
  connection,

  defaultJobOptions: {
    // How many times to retry a failed job
    // This REPLACES your manual retryCount logic in event.service.js
    attempts: 3,

    backoff: {
      // exponential = wait longer between each retry
      // attempt 1 fails → wait 10 seconds → retry
      // attempt 2 fails → wait 20 seconds → retry
      // attempt 3 fails → wait 40 seconds → move to failed
      // This REPLACES your manual delay calculation code
      type: "exponential",
      delay: 5000
    },

    // Keep completed jobs for 24 hours — useful for debugging
    // After 24 hours they are automatically cleaned up
    removeOnComplete: {
      age: 24 * 3600,
      count: 100
    },

    // Keep failed jobs forever so you can investigate
    removeOnFail: false
  }
})

// ── Add event to queue ──────────────────────────────────────────────────────
// Called by webhook controller when new event arrives
// jobId = eventId — this gives you automatic deduplication
// If same eventId is added twice, BullMQ silently ignores the second one
// This works TOGETHER with your MongoDB unique index — double protection
exports.addWebhookEvent = async (eventId, type, payload) => {
  const job = await webhookQueue.add(
    // Job name — useful for filtering and monitoring
    `${type}`,

    // Job data — this is what your worker receives
    { eventId, type, payload },

    // Job specific options
    {
      // Using eventId as jobId = automatic deduplication in BullMQ
      // Duplicate jobId = second job silently ignored
      jobId: eventId
    }
  )

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "Job added to BullMQ queue",
    eventId,
    jobId: job.id,
    type
  }))

  return job
}

// ── Get queue statistics ────────────────────────────────────────────────────
// Used by health check endpoint to show queue depth
// Waiting = jobs waiting to be processed
// Active = jobs currently being processed
// Completed = successfully processed jobs
// Failed = jobs that exceeded max attempts
exports.getQueueStats = async () => {
  const waiting = await webhookQueue.getWaitingCount()
  const active = await webhookQueue.getActiveCount()
  const completed = await webhookQueue.getCompletedCount()
  const failed = await webhookQueue.getFailedCount()

  return { waiting, active, completed, failed }
}

// Export queue instance so worker can use it
exports.webhookQueue = webhookQueue