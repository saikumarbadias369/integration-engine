const { default: axios } = require("axios")
const Event = require("../models/event.model")
const tokenservice = require("../services/token.service")

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
        console.log("Processing Event in processEvent()", event.eventId)
        const token = await tokenservice.getValidAccessToken("hubspot")
        // if (Math.random() < 0.5) {
        //     throw new Error("Random failure")
        // }
        console.log("token>>" + token)
        await axios.get("http://localhost:5001/contact", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        console.log("updateStatus processEvent()", event.eventId)

        const processedEvent = await exports.updateStatus(event.eventId, "processed")
        console.log("processed", processedEvent)
    } catch (err) {

        if (err.response?.status === 401) {
            console.log("401 detechetd. refreshing token..")

            const newtoken = await tokenservice.refreshAccessToken("hubspot")

            try {
                await axios.get("http://localhost:5001/contact", {
                    headers: {
                        Authorization: `Bearer ${newtoken}`
                    }
                })
            } catch (e) {
                console.log("with New token>> " + e.message)

            }



            const processedEvent = await exports.updateStatus(event.eventId, "processed")
            console.log("processed", processedEvent)
            return


        }


        const newRetrycount = event.retryCount = 1
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
    const failedEvents = Event.find({ status: "failed", retryCount: { $lt: 3 } })
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