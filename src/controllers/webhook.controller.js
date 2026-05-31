const Joi = require("joi")
const eventService = require("../services/event.service")
const queueService = require("../services/queue.service")


const webhookSchema = Joi.object({
  id: Joi.string().trim().required(),
  type: Joi.string().trim().required(),
  data: Joi.object().required()
})

exports.handlewebhook = async (req, res) => {

  const { error, value } = webhookSchema.validate(req.body)

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    })
  }

  const { id, type, data } = value

  try {
    await eventService.createEvent(id, type, data)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: "Event already received" })
    }
    return res.status(500).json({ success: false, error: "Failed to process webhook" })
  }

  // Event is safely in MongoDB — respond immediately
  // Queue failure should not block the webhook response
  res.status(200).json({ success: true, message: "Webhook received", eventId: id })

  // Push to queue after responding — non-blocking
  queueService.addWebhookEvent(id, type, data).catch(err => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Failed to queue event",
      eventId: id,
      error: err.message
    }))
  })
}