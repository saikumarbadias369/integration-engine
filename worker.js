require("dotenv").config()
const eventService = require("./src/services/event.service")
const mongoose = require("mongoose")



mongoose.connect(process.env.MONGO_URL).then(() => console.log("MongoDB connected")).catch(err => console.log("DB Error"))

const startworker = async () => {
    while (true) {
        await eventService.workerloop()
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
}
startworker()