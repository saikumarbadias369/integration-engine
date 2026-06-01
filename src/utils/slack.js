require("dotenv").config()
const axios = require("axios")
const logger = require("./logger")


const sendSlackAlert = async (message) => {
  try {
   
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message
    })

    logger.info({event:"Slack alert sent"})
   

  } catch (err) {
    logger.error({evnt:"Slack alert failed",error:err.message})
  }
}

module.exports = { sendSlackAlert }