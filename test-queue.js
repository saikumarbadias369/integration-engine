require("dotenv").config()
const { Queue } = require("bullmq")

const parseRedisUrl = (url) => {
  try {
    const redisUrl = new URL(url)
    return { host: redisUrl.hostname, port: parseInt(redisUrl.port) || 6379 }
  } catch (err) {
    return { host: "localhost", port: 6379 }
  }
}

const connection = parseRedisUrl(process.env.REDIS_URL || "redis://localhost:6379")
const TEST_QUEUE = "test-webhook-events"
const TEST_ID = `test-evt-${Date.now()}`

const queue = new Queue(TEST_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60, count: 10 },
    removeOnFail: false
  }
})

const pass = (label, data) => {
console.log(`PASS: ${label}`)
  if (data) console.log(JSON.stringify(data, null, 2))
}

const fail = (label, err) => {
  console.error(`❌ ${label}: ${err.message}`)
  process.exit(1)
}

const run = async () => {
  console.log(`\nRunning queue tests — ${connection.host}:${connection.port}\n`)

  // 1. add job
  let job1
  try {
    job1 = await queue.add(
      "contact.created",
      { eventId: TEST_ID, type: "contact.created", payload: { email: "test@example.com" } },
      { jobId: TEST_ID }
    )
    pass("Job added", { jobId: job1.id, eventId: TEST_ID })
  } catch (err) {
    fail("Job add failed", err)
  }

  // 2. queue stats
  try {
    const stats = {
      waiting: await queue.getWaitingCount(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount()
    }
    if (stats.waiting < 1) throw new Error(`waiting count is ${stats.waiting}, expected >= 1`)
    pass("Queue stats", stats)
  } catch (err) {
    fail("Queue stats", err)
  }

  // 3. idempotency — same jobId should not create a second job
  try {
    const job2 = await queue.add(
      "contact.created",
      { eventId: TEST_ID, type: "contact.created", payload: { email: "test@example.com" } },
      { jobId: TEST_ID }
    )
    if (job1.id !== job2.id) throw new Error(`duplicate created — ${job1.id} vs ${job2.id}`)
    pass("Idempotency — duplicate ignored", { jobId: job1.id })
  } catch (err) {
    fail("Idempotency", err)
  }

  // 4. job data intact
  try {
    const fetched = await queue.getJob(TEST_ID)
    if (!fetched) throw new Error("job not found by jobId")
    if (fetched.data.eventId !== TEST_ID) throw new Error("eventId mismatch")
    pass("Job data intact", { storedEventId: fetched.data.eventId })
  } catch (err) {
    fail("Job data integrity", err)
  }

  // 5. retry config
  try {
    const fetched = await queue.getJob(TEST_ID)
    const attempts = fetched.opts?.attempts
    const backoff = fetched.opts?.backoff?.type
    if (attempts !== 3 || backoff !== "exponential") {
      throw new Error(`unexpected config — attempts: ${attempts}, backoff: ${backoff}`)
    }
    pass("Retry config", { attempts, backoff })
  } catch (err) {
    fail("Retry config", err)
  }

  // cleanup
  try {
    const job = await queue.getJob(TEST_ID)
    if (job) await job.remove()
    await queue.close()
  } catch (err) {
    console.warn(`cleanup warning: ${err.message}`)
  }

  console.log("\n All tests passed — ready to commit\n")
  process.exit(0)
}

run().catch((err) => {
  console.error("Unexpected error:", err.message)
  process.exit(1)
})