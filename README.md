# Restaurant Self-Ordering MVP

Simple MVP system:
- Customer page via QR URL (`/order?type=table&id=1`, `/order?type=bar&id=1`, `/order?type=togo`)
- Staff page (`/staff`) with polling every 3 seconds
- Order statuses: `pending`, `entered`
- Backend: Node.js + Express
- Frontend: React (Vite)
- Database: MySQL

## Project Structure

- `backend`: API server + MySQL access
- `frontend`: customer/staff web app

## 1) Setup MySQL

Create schema/table:

```sql
SOURCE /absolute/path/to/backend/schema.sql;
```

Or copy SQL from `backend/schema.sql` and run manually.

## 2) Run Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend default: `http://localhost:4000`

## 3) Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Pages

- Customer ordering page:
  - `http://localhost:5173/order?type=table&id=1`
  - `http://localhost:5173/order?type=bar&id=1`
  - `http://localhost:5173/order?type=togo`
- Staff page:
  - `http://localhost:5173/staff`

## Behavior Rules Implemented

1. Table count: 1-7, bar seats: 1-4, to-go: no id.
2. Table/bar orders do not accept customer name.
3. To-go orders require customer name.
4. Customer can select menu items and submit.
5. Staff page receives orders and sorts by create time ascending.
6. Staff can mark each order from `pending` to `entered`.
7. Staff page auto refreshes every 3 seconds.

## Optional: Phone Push Notifications (Telegram)

When a new order is submitted, backend can push a message to your phone via Telegram Bot.

1) Create a bot with BotFather and get `TELEGRAM_BOT_TOKEN`.
2) Send any message to your bot once.
3) Get your chat id from:
   - `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4) Put values in `backend/.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

5) Restart backend.

## Optional: SMS Notifications (Twilio)

When a new order is submitted, backend can send SMS to your phone.

1) Create a Twilio account and get:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - a Twilio phone number (`TWILIO_FROM_NUMBER`)
2) Set your receiving number (`TWILIO_TO_NUMBER`, E.164 format, e.g. `+1...`).
3) Put values in `backend/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
TWILIO_TO_NUMBER=+1xxxxxxxxxx
```

4) Restart backend.

Notes:
- You can keep Telegram and Twilio at the same time.
- If Twilio fields are empty, SMS is skipped automatically.
