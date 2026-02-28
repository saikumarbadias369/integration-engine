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
        console.log("Processing Event", event.eventId)
        if (Math.random() < 0.5) {
            throw new Error("Random failure")
        }

        const processedEvent = await exports.updateStatus(event.eventId, "processed")
        console.log("processed", processedEvent)
    } catch (err) {
        const newRetrycount=event.retryCount=1
        if(newRetrycount>=3){

        Event.findOneAndUpdate({ eventId: event.eventId }, { status: "dead", $inc: { retryCount: 1 }, lastError: err.message})
console.error("ALERT Mail Sent: DEAD EVENT",event.eventId)
        }else{
const delay=Math.pow(2,event.retryCount)*60*1000
        Event.findOneAndUpdate({ eventId: event.eventId }, { status: "failed", $inc: { retryCount: 1 }, lastError: err.message ,nextRetryAt:new Date(Date.now()+delay)})

        }
        

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
        await Promise.all(batch.Map(e => exports.processedEvent(e)))
    }
}


exports.workerloop = async () => {
    try {
        await Event.updateMany({
            status: "Processing",
            updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
        }, { status: "failed" })
        
        const retryFailedEvents = Event.find({ status: "failed", retryCount: { $lt: 3 },nextRetryAt:{$lte:new Date()} }).limit(5)
        if(retryFailedEvents.length>0)
        for (const event of retryFailedEvents) {
            const lockEvent = await Event.findOneAndUpdate({ eventId: event.eventId, status: "failed" }, { status: "processing" }, { new: true })
            if (lockEvent) {
                await exports.processedEvent(lockEvent)
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