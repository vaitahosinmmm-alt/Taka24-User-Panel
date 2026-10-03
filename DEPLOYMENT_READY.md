# Taka24 User Site — Deployment Ready

## Frontend + Backend
Express serves the existing User Site and API.

## Production
Use:
npm install
npm start

## Health check
GET /api/health

## Important
The current LowDB `taka24.json` is local storage.
Before production use, migrate persistent user/application data to a hosted database.
Do not treat a temporary Cloudflare Quick Tunnel as production hosting.
