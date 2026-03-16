const eventService = require("../services/event.service")
exports.handlewebhook = async (req, res) => {
    const { id, type, data } = req.body
    try {
         console.log({ id, type, data })
        const event = await eventService.createEvent(id, type, data)
       console.log("event> "+event)
        res.status(200).send("webhook received")
       
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).send("Event already processed")
        }
        res.status(500).send("webhook error")
    }
}












