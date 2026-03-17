# Integration Engine Project

## Overview
This project is a backend integration system built using Node.js that processes webhook events and integrates with external CRM APIs.

The system follows an event-driven architecture where incoming requests are stored and processed asynchronously to ensure reliability and scalability.

---

## Key Features
- Webhook ingestion system
- Event storage using MongoDB
- Background worker for asynchronous processing
- Retry mechanism with exponential backoff
- OAuth token handling with refresh logic
- Rate limiting for external API calls
- CI pipeline using GitHub Actions

---

## Architecture
Webhook → API Server → MongoDB (Event Store) → Worker → CRM API

---

## System Flow

1. Webhook request is received by the API server
2. Event is stored in MongoDB with "pending" status
3. Server responds immediately to avoid timeout
4. Worker continuously polls pending events
5. Worker processes events and calls CRM API
6. On success → event marked as "processed"
7. On failure → retry logic is applied
8. After max retries → event marked as "dead"

---

## Retry Strategy

- Failed events are retried automatically
- Exponential backoff is used to delay retries
- Retry count is tracked in the database
- Events exceeding retry limit are marked as "dead"

---

## OAuth Handling

- Access tokens are used for CRM API calls
- If token expires (401 error), refresh token is used
- New access token is generated without interrupting flow

---

## Tech Stack

- Node.js
- Express
- MongoDB
- Axios
- JWT
- GitHub Actions (CI)

---

## How to Run

### Install Dependencies
npm install

### Start Server
npm run start

### Start Worker
npm run worker

---

## Notes

- Server handles incoming webhook requests
- Worker processes events asynchronously
- System is designed to handle failures and retries
- Suitable for real-world integration use cases