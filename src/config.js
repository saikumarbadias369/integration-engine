const required = [
  "MONGO_URL",
  "PORT",
  "HUBSPOT_CLIENT_ID",
  "HUBSPOT_CLIENT_SECRET",
  "HUBSPOT_REDIRECT_URI",
  "SLACK_WEBHOOK_URL"
]

const missing = required.filter(key => !process.env[key])

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`)
  process.exit(1)  // app refuses to start — fails fast instead of crashing later
}

module.exports = {
  mongoUrl: process.env.MONGO_URL,
  port: process.env.PORT || 5004,
//   crmBaseUrl: process.env.CRM_BASE_URL,
}