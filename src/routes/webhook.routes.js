const express = require("express")
const router = express.Router()
const {handlewebhook}= require("../controllers/webhook.controller")

router.post("/", handlewebhook)
module.exports = router