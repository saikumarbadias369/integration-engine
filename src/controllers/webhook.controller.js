const eventService = require("../services/event.service")

exports.handlewebhook = async (req, res) => {
  const { id, type, data } = req.body

  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: id"
    })
  }

  if (!type) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: type"
    })
  }

  if (!data || typeof data !== "object") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid field: data must be an object"
    })
  }

  try {
    const event = await eventService.createEvent(id, type, data)

   
    return res.status(200).json({
      success: true,
      message: "Webhook received",
      eventId: id
    })

  } catch (error) {

 
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "Event already received"
      })
    }

    return res.status(500).json({
      success: false,
      error: "Failed to process webhook"
    })
  }
}