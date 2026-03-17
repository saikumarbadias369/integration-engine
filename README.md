# Integration Engine Project

## Overview
This project is a backend integration system built using Node.js.  
It processes webhook events and integrates with external CRM APIs.

## Features
- Webhook endpoint to receive events
- Event storage in MongoDB
- Background worker to process events
- Retry mechanism with exponential backoff
- OAuth token handling
- Rate limiting for API calls
- Basic CI pipeline using GitHub Actions

## Architecture
Webhook → Server → MongoDB → Worker → CRM API

## Tech Stack
- Node.js
- Express
- MongoDB
- Axios
- JWT

## How to Run

### Install Dependencies
npm install

### Start Server
npm run start

### Start Worker
npm run worker

## Notes
- Server handles incoming requests
- Worker processes events asynchronously
- Events are retried if API fails
ddd


