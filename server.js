require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const webhookRoutes = require("./src/routes/webhook.routes")
const eventService = require("./src/services/event.service")
const oauthRoutes = require("./src/routes/oauth.routes");

const app = express()
app.use(express.json());



mongoose.connect(process.env.MONGO_URL).then(() => console.log("MongoDB connected")).catch(err => console.log("DB Error"))

app.use("/oauth", oauthRoutes);
app.use("/webhook", webhookRoutes);


app.get("/", (req, res) => {
    res.json({ message: "engine Running" })
})


const startworker = async () => {
    while (true) {
        await eventService.workerloop()
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
}




app.listen(5004, () => {
    console.log("Server Running on " + 5004)
})

startworker()
