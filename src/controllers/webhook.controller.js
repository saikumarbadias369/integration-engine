const Event = require("../models/event.model")

exports.handlewebhook = async (req, res) => {
    const { id, type, data } = req.body;
    try {
        const event = await Event.create({
            eventId: id,
            type,
            payload: data
        })
        console.log(event)
        res.status(200).send("Webhook receivd")
    } catch (err) {
        if (err.code === 11000) {
            return res.status(200).send("Event already processed")
        }
        res.status(500).send("webhook error")
    }

};