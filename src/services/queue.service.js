const { Queue } = require("bullmq")
const logger = require("../utils/logger")
const { connection, QUEUE_NAMES } = require("../config/queue.config")

const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_EVENTS, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: { age: 24 * 3600, count: 100 },
    removeOnFail: false
  }
})

// jobId = eventId gives automatic deduplication — duplicate events are ignored
exports.addWebhookEvent = async (eventId, type, payload) => {
  const job = await webhookQueue.add(
    `${type}`,
    { eventId, type, payload },
    { jobId: eventId }
  )

  logger.info({ event: "Job added to queue", eventId, jobId: job.id, type })

  return job
}

exports.getQueueStats = async () => {
  const waiting = await webhookQueue.getWaitingCount()
  const active = await webhookQueue.getActiveCount()
  const completed = await webhookQueue.getCompletedCount()
  const failed = await webhookQueue.getFailedCount()

  return { waiting, active, completed, failed }
}

exports.webhookQueue = webhookQueue