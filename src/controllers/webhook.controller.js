const eventService = require("../services/event.service")


exports.handlewebhook = async (req, res) => {
    const { id, type, data } = req.body
    try {
        const event = await eventService.createEvent(id, type, data)
        res.status(200).send("webhook received")
        eventService.processEvent(event)
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).send("Event already processed")
        }
        res.status(500).send("webhook error")
    }
}





