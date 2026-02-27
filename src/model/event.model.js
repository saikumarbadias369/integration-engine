const mongoose = require("mongoose")

const eventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true
    },
    type: String,
    payload: Object,
    status: {
        type: String,
        default: "Pending"
    }
}, { timestamps: true })

module.exports = mongoose.model("Event", eventSchema)