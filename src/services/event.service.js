const Event = require("../models/event.model")

exports.createEvent = async (id, type, data) => {

    return await Event.create({
        eventId: id,
        type,
        payload: data

    })
}

exports.updateStatus = async (eventId, status) => {
    return await Event.findOneAndUpdate({ eventId }, { status })
}

exports.processEvent = async (event) => {
    try {
        console.log("Processing Event")
        await new Promise(resolve => setTimeout(resolve, 2000))

        await exports.updateStatus(event.eventId, "processed")
    } catch (err) {
        await exports.updateStatus(event.eventId, "failed")
    }
}