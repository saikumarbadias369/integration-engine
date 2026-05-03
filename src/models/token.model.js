const mongoose = require("mongoose")

const tokenSchema = new mongoose.Schema({
    provider: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }

}, { timestamps: true })

tokenSchema.index({ provider: 1 }, { unique: true })

module.exports=mongoose.model("Token",tokenSchema)