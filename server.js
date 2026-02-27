require("dotenv").config()
const express=require("express")
const mongoose=require("mongoose")
const webhookRouter=require("./src/controllers/webhook.controller")

const app=express()
mongoose.connect(process.env.MONGO_URL).then(()=>console.log("MongoDB connected")).catch(err =>console.log("DB Error"))

app.get("/",(req,res)=>{
    res.json({message:"engine Running"})
})

app.use("/webhook",webhookRouter)

app.listen(5004,()=>{
    console.log("Server Running on "+5004)
})


