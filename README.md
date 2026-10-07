# Code Review Room

A real-time collaborative code review app. Multiple developers join a room, edit code together with conflict-free sync (Yjs / CRDT), and request an AI review whose comments stream live to everyone in the room.

**Stack:** React 18 (Vite), Monaco Editor, Yjs, Node.js, Express, Socket.io, MongoDB (Mongoose), Google Gemini.

## Architecture

```
┌────────────┐  HTTP/WS   ┌───────────────────────────────────┐
│  React 18  │◄──────────►│         Express + Socket.io       │
│  Monaco    │            │                                   │
│  Yjs       │            │  ┌───────────┐  ┌─────────────┐  │
│  (Vite)    │            │  │ Yjs Docs  │  │ LLM Service │  │
│  :5173     │            │  │ (in-mem)  │  │ Gemini/Mock │  │
└────────────┘            │  └─────┬─────┘  └──────┬──────┘  │
                          │        │               │          │
                          │  ┌─────▼───────────────▼──────┐  │
                          │  │          MongoDB            │  │
                          │  │  Users, Rooms, Reviews      │  │
                          │  └─────────────────────────────┘  │
                          │             :5000                  │
                          └───────────────────────────────────┘
```

## Features

- **Real-time collaborative editing**: Yjs CRDT over Socket.io, with named multi-cursors
- **Rooms**: create a room, share a 6-character code, join instantly
- **AI code review**: Gemini streams review comments live to all participants
- **Mock review mode**: works without an API key using simple heuristics
- **Presence**: see who is online with colored avatars
- **Comment management**: accept or dismiss comments, synced in real time
- **Persistence**: documents and reviews survive server restarts via MongoDB

## Prerequisites

- Node.js 20+
- MongoDB: a local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

## Setup

```bash
git clone https://github.com/1shikharvarshney1/Code-Review-Room.git
cd Code-Review-Room

# Install root + server + client dependencies
npm run install:all

# Configure the server
cp server/.env.example server/.env
# Edit server/.env and set MONGODB_URI and JWT_SECRET

npm run dev
```

The client runs at http://localhost:5173 and proxies API and WebSocket traffic to the server on port 5000.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `MONGODB_URI` | **Yes** | none | MongoDB connection string |
| `JWT_SECRET` | **Yes** | none | Secret for signing JWTs |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `GEMINI_API_KEY` | No | empty (mock mode) | Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | Gemini model name |
| `MAX_REVIEW_LINES` | No | `300` | Max lines accepted per review |
| `REVIEW_COOLDOWN_SECONDS` | No | `15` | Seconds between reviews |

## Enabling the Real AI

1. Create a free key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Put it in `server/.env` as `GEMINI_API_KEY=your_key`, then restart the server.
3. The review panel badge changes from "Mock" to "AI".

If you see "The configured GEMINI_MODEL is not available", set `GEMINI_MODEL` to a model your key can use (check AI Studio). If you hit a rate limit, wait about a minute.

> **Privacy:** on the free tier, Google may use prompts to improve its products. Don't paste private or proprietary code.

## Using it with Two Users

Login is stored in the browser, so two normal windows share one user. Use **one normal window and one incognito window** (or two different browsers):

1. Register a different user in each window.
2. User A creates a room, User B joins with the room code.
3. Type in both windows. Text merges without conflicts, with named cursors.
4. Click **Request AI Review** and watch the comments stream into both windows.

## Socket Events

### Client to Server

| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ code }` | Join a room (must be a member) |
| `room:leave` | `{ code }` | Leave a room |
| `yjs:sync-request` | `{ code }` | Request full document state |
| `yjs:update` | `{ code, update }` | Send a Yjs update |
| `awareness:update` | `{ code, update }` | Send cursor/presence state |
| `review:request` | `{ code }` | Request an AI review |
| `comment:status` | `{ reviewId, commentId, status }` | Accept or dismiss a comment |

### Server to Client

| Event | Payload | Description |
|---|---|---|
| `room:joined` | `{ room, users, latestReview }` | Confirms room entry |
| `presence:update` | `{ users }` | Current users in the room |
| `yjs:sync` | `{ update }` | Full document state |
| `yjs:update` | `{ update }` | Incremental document update |
| `awareness:update` | `{ update }` | Remote cursor state |
| `review:started` | `{ reviewId, requestedBy, provider }` | Review began |
| `review:comment` | `{ reviewId, comment }` | Streamed review comment |
| `review:summary` | `{ reviewId, summary }` | Review summary |
| `review:done` | `{ reviewId }` | Review complete |
| `review:error` | `{ message }` | Review error |
| `comment:updated` | `{ reviewId, comment }` | Comment status changed |
| `app:error` | `{ message }` | General error |

## Known Limitations

- Free Gemini tier has per-minute and daily limits.
- The editor does not run code; it only reviews it.
- Two users in two normal windows of the same browser share one login.