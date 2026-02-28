require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const webhookRoutes = require("./src/routes/webhook.routes")
const eventService = require("./src/services/event.service")

const app = express()
app.use(express.json());
app.use("/webhook", webhookRoutes);
mongoose.connect(process.env.MONGO_URL).then(() => console.log("MongoDB connected")).catch(err => console.log("DB Error"))

app.get("/", (req, res) => {
    res.json({ message: "engine Running" })
})


const startworker = async () => {
    while (true) {
        await eventService.workerloop()
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
}




app.listen(5004, () => {
    console.log("Server Running on " + 5004)
})

startworker()
