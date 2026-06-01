const express = require("express")
const router = express.Router()
const hubspot = require("../services/hubspot.service")

// Step 1 — Visit this URL to connect HubSpot
// Opens HubSpot login and permission screen
router.get("/hubspot", (req, res) => {
  const authUrl = hubspot.getAuthUrl()
  res.redirect(authUrl)
})

// Step 2 — HubSpot redirects here after user approves
// Exchanges the code for real access + refresh tokens
router.get("/hubspot/callback", async (req, res) => {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ success: false, error: "No code received from HubSpot" })
  }

  try {
    await hubspot.exchangeCodeForTokens(code)
    res.json({
      success: true,
      message: "HubSpot connected successfully. You can now process events."
    })
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "HubSpot OAuth failed",
      error: err.message
    }))
    res.status(500).json({ success: false, error: "OAuth failed: " + err.message })
  }
})

module.exports = router
















