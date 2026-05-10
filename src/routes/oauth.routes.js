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


















// const express = require("express");
// const router = express.Router();

// const axios = require("axios");
// const tokenService = require("../services/token.service");


// router.get("/connect-crm", (req, res) => {
//     const authUrl = `https://crm-integration-engine.onrender.com/authorize?client_id=test123&redirect_uri=https://integration-engine-g6wv.onrender.com/oauth/callback`;

//     res.redirect(authUrl);
// });




// router.get("/callback", async (req, res) => {
//     console.log(req.query)
//     const { code } = req.query;
//     console.log(code)

//     try {
//         const response = await axios.post("https://crm-integration-engine.onrender.com/token", {
//             grant_type: "authorization_code",
//             code,
//             client_id: "test123"
//         });
//         console.log('response>>Data> ' + response.data)

//         await tokenService.saveToken("hubspot", response.data);

//         res.send("CRM Connected Successfully!");

//     } catch (error) {
//         res.status(500).send("OAuth failed");
//     }
// });






// module.exports = router;


