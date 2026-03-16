const { default: axios } = require("axios")
const Event = require("../models/event.model")
const tokenservice = require("../services/token.service")
const crmClient = require("./crm.client")

exports.createEvent = async (id, type, data) => {
    console.log("in Create Event>" + id)
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
       await crmClient.getContact()
        const processedEvent = await exports.updateStatus(event.eventId, "processed")
        console.log("processed", processedEvent)
    } catch (err) {


        const newRetrycount = event.retryCount + 1
        if (newRetrycount >= 3) {

            await Event.findOneAndUpdate({ eventId: event.eventId }, { status: "dead", $inc: { retryCount: 1 }, lastError: err.message })
            console.error("ALERT Mail Sent: DEAD EVENT", event.eventId)
        } else {
            const delay = Math.pow(2, event.retryCount) * 60 * 1000
            await Event.findOneAndUpdate({ eventId: event.eventId }, { status: "failed", $inc: { retryCount: 1 }, lastError: err.message, nextRetryAt: new Date(Date.now() + delay) })

        }

        console.log("err>>" + err.message)


    }
}


exports.retryFailedEvents = async () => {
    const failedEvents = await Event.find({ status: "failed", retryCount: { $lt: 3 } })
    for (const event of failedEvents) {
        console.log("Processing", event.eventId)
        await exports.processEvent(event)
    }
}

const processIbBatches = async (events, concurancy = 3) => {
    for (let i = 0; i < events.length; i += concurancy) {
        const batch = events.slice(i, i + concurancy)
        await Promise.all(batch.map(e => exports.processEvent(e)))
    }
}


exports.workerloop = async () => {
    console.log("...WORKING")
    try {
        const updatedevent = await Event.updateMany({
            status: "processing",
            updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
        }, { status: "failed" }, { new: true })

        console.log("updatedevent> " + updatedevent)

        const retryFailedEvents = await Event.find({ status: "failed", retryCount: { $lt: 4 }, nextRetryAt: { $lte: new Date() } }).limit(5)
        console.log("retryFailedEvents>>" + retryFailedEvents.length)
        if (retryFailedEvents.length > 0)
            for (const event of retryFailedEvents) {
                const lockEvent = await Event.findOneAndUpdate({ eventId: event.eventId, status: "failed" }, { status: "processing" }, { new: true })
                if (lockEvent) {
                    await exports.processEvent(lockEvent)
                }
            }


        const events = await Event.find({ status: "pending" }).limit(10)
        const lockedEvents = []

        for (const event of events) {
            console.log("worker process Started for type pending " + event.eventId)
            const lockEvent = await Event.findOneAndUpdate({ eventId: event.eventId, status: "pending" }, { status: "processing" }, { new: true })
            if (lockEvent) {
                lockedEvents.push(lockEvent)
            }
        }
        if (lockedEvents.length > 0) {
            await processIbBatches(lockedEvents, 3)
        }

    } catch (err) {
        console.log("worker erroe", err.message)
    }
}