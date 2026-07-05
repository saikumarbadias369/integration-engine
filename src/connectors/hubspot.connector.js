const hubspot = require("../services/hubspot.service")
const limiter = require("../utils/ratelimiter")

exports.name = "hubspot"

exports.processEvent = async (payload) => {
  return await limiter.schedule(async () => {
    const contact = await hubspot.createContact(payload)
    return contact
  })
}