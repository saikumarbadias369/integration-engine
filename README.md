# Integration Engine

A backend system that receives webhook events, processes them asynchronously, and creates contacts in HubSpot CRM. Built to understand how production integration systems handle failures, retries, and third-party API communication.

**Live:** https://integration-engine-g6wv.onrender.com/health

---

## What it does

When a webhook event comes in, the server stores it immediately and responds — no waiting. A separate worker picks it up, calls the HubSpot API, and marks it done. If it fails, it retries with exponential backoff. If it keeps failing, it marks the event dead and fires a Slack alert.

```
Client → POST /webhook → Express server → MongoDB (pending)
                                              ↓
                                    Worker polls every 5s
                                              ↓
                                    HubSpot CRM API
                                              ↓
                                    status: processed
                                    (or failed → retry → dead → Slack alert)
```

---

## Architecture

Two separate services running on Render:

**Web service** — handles incoming requests, validates payload, stores event, responds immediately

**Worker service** — runs independently, polls MongoDB for pending events, processes them, calls HubSpot

Keeping them separate means if the worker crashes, the API is still up and taking requests.

---

## Key features

**Idempotency** — each event has a unique ID. If the same webhook arrives twice, the second one is silently ignored. No duplicate contacts in HubSpot.

**Retry with exponential backoff** — failed events retry at 1min, 2min, 4min delays. Tracked in the database so retries survive worker restarts.

**Dead letter** — after 3 failed retries, event is marked `dead` and isolated. One bad event never blocks the queue.

**Token refresh** — HubSpot OAuth tokens expire. The system detects 401s and refreshes automatically without interrupting the flow.

**Rate limiting** — outbound HubSpot API calls are spaced 200ms apart using Bottleneck. Prevents hitting API quotas under load.

**Slack alerts** — when an event goes dead, a message fires to the team Slack channel immediately.

**Health checks** — both services expose `/health` endpoints that check DB connectivity. Returns 503 if database is down so Render can auto-restart.

**Structured logging** — every request and event logged as JSON with timestamp, so logs can be parsed and searched in production.

---

## Event status flow

```
pending → processing → processed
              ↓
           failed → (retry) → dead → Slack alert
```

---

## Tech stack

- Node.js + Express
- MongoDB Atlas
- Axios
- Bottleneck (rate limiting)
- HubSpot CRM API (OAuth 2.0)
- Slack Incoming Webhooks
- Render (deployment)

---

## How to run locally

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Terminal 1 — start server
npm run dev

# Terminal 2 — start worker
node worker.js
```

### Connect HubSpot

```
GET http://localhost:5004/oauth/hubspot
```

Opens HubSpot OAuth flow. Approve once — tokens are saved to MongoDB and refresh automatically.

### Send a test webhook

```bash
curl -X POST http://localhost:5004/webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"test-001","type":"contact.created","data":{"email":"test@example.com","firstname":"Test","lastname":"User"}}'
```

Check HubSpot contacts — contact should appear within 10 seconds.

---

## Environment variables

See `.env.example` for all required variables.

```
MONGO_URL
HUBSPOT_CLIENT_ID
HUBSPOT_CLIENT_SECRET
HUBSPOT_REDIRECT_URI
SLACK_WEBHOOK_URL
PORT
```

---

## Project structure

```
├── server.js              # Express server, routes, middleware
├── worker.js              # Background worker with health endpoint
└── src/
    ├── controllers/
    │   └── webhook.controller.js   # Input validation, event creation
    ├── routes/
    │   ├── webhook.routes.js
    │   └── oauth.routes.js         # HubSpot OAuth flow
    ├── services/
    │   ├── event.service.js        # Worker loop, retry logic, batch processing
    │   ├── hubspot.service.js      # HubSpot OAuth + contacts API
    │   ├── token.service.js        # Token storage and refresh
    │   └── crm.client.js           # Rate-limited CRM calls
    ├── models/
    │   ├── event.model.js
    │   └── token.model.js
    └── utils/
        ├── ratelimiter.js          # Bottleneck config
        └── slack.js                # Slack alert utility
```