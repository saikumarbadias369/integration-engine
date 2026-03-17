const express = require("express");
const router = express.Router();

const axios = require("axios");
const tokenService = require("../services/token.service");


router.get("/connect-crm", (req, res) => {
    const authUrl = `https://crm-integration-engine.onrender.com/authorize?client_id=test123&redirect_uri=http://localhost:5004/oauth/callback`;

    res.redirect(authUrl);
});




router.get("/callback", async (req, res) => {
    console.log(req.query)
    const { code } = req.query;
    console.log(code)

    try {
        const response = await axios.post("https://crm-integration-engine.onrender.com/token", {
            grant_type: "authorization_code",
            code,
            client_id: "test123"
        });
        console.log('response>>Data> ' + response.data)

        await tokenService.saveToken("hubspot", response.data);

        res.send("CRM Connected Successfully!");

    } catch (error) {
        res.status(500).send("OAuth failed");
    }
});






module.exports = router;

