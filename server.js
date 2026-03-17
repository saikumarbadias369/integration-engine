require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const webhookRoutes = require("./src/routes/webhook.routes")
const oauthRoutes = require("./src/routes/oauth.routes");

const app = express()
app.use(express.json());
app.use((err,req,res,next)=>{
    if(err instanceof SyntaxError){
        console.log("Invalid JSIN received")
        return res.status(400).send("Invalid JSON")
    }
    next()
})



mongoose.connect(process.env.MONGO_URL).then(() => console.log("MongoDB connected")).catch(err => console.log("DB Error"))

app.use("/oauth", oauthRoutes);
app.use("/webhook", webhookRoutes);


app.get("/", (req, res) => {
    res.json({ message: "engine Running" })
})

const PORT=process.env.PORT || 5004

app.listen(PORT, () => {
    console.log("Server Running on " + 5004)
})


