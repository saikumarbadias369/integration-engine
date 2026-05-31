const { Queue, Worker } = require("bullmq")

// Parse Redis URL into host and port
// BullMQ needs host and port separately — not a full URL
// Example: redis://localhost:6379
//          host = localhost, port = 6379
const parseRedisUrl = (url) => {
  try {
    const redisUrl = new URL(url)
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port) || 6379
    }
  } catch (err) {
    // Fallback to defaults if URL parsing fails
    return { host: "localhost", port: 6379 }
  }
}

const connection = parseRedisUrl(
  process.env.REDIS_URL || "redis://localhost:6379"
)

// Queue names as constants
// WHY: If you mistype "webhook-events" as "webhook-event" somewhere,
// your jobs go to a different queue silently — very hard to debug
// Using constants means a typo = immediate code error, not silent bug
const QUEUE_NAMES = {
  WEBHOOK_EVENTS: "webhook-events"
}

module.exports = { connection, QUEUE_NAMES }