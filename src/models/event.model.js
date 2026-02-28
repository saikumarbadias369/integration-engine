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
        enum: ["pending", "processing", "processed", "failed","dead"],
        default: "pending"
    },
    retryCount: {
        type: Number,
        default: 0
    },
    lastError: String,
    nextRetryAt:Date
}, { timestamps: true })

module.exports = mongoose.model("Event", eventSchema)