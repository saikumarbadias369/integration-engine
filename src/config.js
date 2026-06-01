const required = [
  "MONGO_URL",
  "PORT",
  "HUBSPOT_CLIENT_ID",
  "HUBSPOT_CLIENT_SECRET",
  "HUBSPOT_REDIRECT_URI",
  "SLACK_WEBHOOK_URL",
  "REDIS_URL"           
]

const missing = required.filter(key => !process.env[key])

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`)
  process.exit(1)
}

module.exports = {
  mongoUrl: process.env.MONGO_URL,
  port: process.env.PORT || 5004,
  redisUrl: process.env.REDIS_URL,    
  crmBaseUrl: process.env.CRM_BASE_URL,
}