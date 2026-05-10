const axios = require("axios")
const Token = require("../models/token.model")

const HUBSPOT_BASE = "https://api.hubspot.com"
const PROVIDER = "hubspot"

// Step 1 — Build the OAuth URL to redirect user to HubSpot login
exports.getAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID,
    redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
    scope: "crm.objects.contacts.read crm.objects.contacts.write",
  })
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`
}

// Step 2 — Exchange the code HubSpot sends back for real access + refresh tokens
exports.exchangeCodeForTokens = async (code) => {
  const response = await axios.post(
    "https://api.hubapi.com/oauth/v1/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
      code,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  )

  const { access_token, refresh_token, expires_in } = response.data

  // Save tokens to MongoDB
  await Token.findOneAndUpdate(
    { provider: PROVIDER },
    {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
    { upsert: true, new: true }
  )

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "HubSpot tokens saved"
  }))

  return access_token
}

// Step 3 — Get valid token, refresh if expired
exports.getValidToken = async () => {
  const token = await Token.findOne({ provider: PROVIDER })
  console.log("getValidToken>>" + token.accessToken)

  if (!token) throw new Error("No HubSpot token found. Please connect via /oauth/hubspot")

  // Token still valid — return it
  if (Date.now() < token.expiresAt.getTime()) {
    return token.accessToken
    // return "CLb6zYHhMxIQQlNQMl8kQEwrAgMACAkWEhi3nK91IMSo4SsojMLPEjIUMtBlxcyqmhULsKOPwGF3ePh9pV46F0JTUDJfJEBMKwIKAAgZBnFOMAEBAWQFQhTHVo9Bn1uScq880eaj9Rs9V_j4cEoDbmEyUgBaAGAAaMSo4StwAHgA"//token.accessToken
  }

  // Token expired — refresh it
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "HubSpot token expired - refreshing"
  }))

  const response = await axios.post(
    "https://api.hubapi.com/oauth/v1/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      refresh_token: token.refreshToken,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  )

  const { access_token, refresh_token, expires_in } = response.data

  await Token.findOneAndUpdate(
    { provider: PROVIDER },
    {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    }
  )

  return access_token
}

// Step 4 — Create a contact in HubSpot
exports.createContact = async (eventData) => {
  const token = await exports.getValidToken()

  try {
    const response = await axios.post(
      `${HUBSPOT_BASE}/crm/v3/objects/contacts`,
      {
        properties: {
          email: eventData.email || `event-${Date.now()}@integration.test`,
          firstname: eventData.firstname || "Integration",
          lastname: eventData.lastname || "Engine",
          phone: eventData.phone || "",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "HubSpot contact created",
      contactId: response.data.id
    }))

    return response.data

  } catch (err) {
    // Log full HubSpot error response
    if (err.response?.status === 409) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "HubSpot contact already exists",
        existingId: err.response.data.message
      }))
      return { id: "existing", message: err.response.data.message }
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "HubSpot createContact failed",
      status: err.response?.status,
      error: err.response?.data
    }))
    throw err

  }
}

// Step 5 — Get a contact from HubSpot
exports.getContact = async (contactId) => {
  const token = await exports.getValidToken()


  const response = await axios.get(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${contactId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  return response.data
}