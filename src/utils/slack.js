require("dotenv").config()
const axios = require("axios")


const sendSlackAlert = async (message) => {
  try {
   
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message
    })

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Slack alert sent"
    }))

  } catch (err) {
  
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "Slack alert failed",
      error: err.message
    }))
  }
}

module.exports = { sendSlackAlert }