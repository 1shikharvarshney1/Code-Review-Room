# Code Review Room

A real-time collaborative code review application where multiple developers join a room, edit code together with conflict-free sync (Yjs / CRDT), and request an AI-powered review whose comments stream live to everyone in the room.

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
                          │  │        MongoDB              │  │
                          │  │  Users, Rooms, Reviews      │  │
                          │  └────────────────────────────-┘  │
                          │         :5000                      │
                          └───────────────────────────────────┘
```

## Features

- **Real-time collaborative editing** — Yjs CRDT over Socket.io, multi-cursor with name labels
- **Room-based workflow** — create a room, share a 6-character code, join instantly
- **AI code review** — Google Gemini streams review comments live to all participants
- **Mock review mode** — works without an API key using heuristic analysis
- **Presence awareness** — see who is online with colored avatars and cursors
- **Comment management** — accept / dismiss comments, synced in real-time
- **Persistent state** — documents and reviews survive server restarts via MongoDB
- **Dark theme** — modern slate/indigo UI with no external CSS frameworks

## Prerequisites

- **Node.js 20+**
- **MongoDB** — local instance (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

## Setup

```bash
# 1. Clone the repo
git clone <repo-url> code-review-room
cd code-review-room

# 2. Install all dependencies (root + server + client)
npm run install:all

# 3. Configure the server environment
cp server/.env.example server/.env
# Edit server/.env — at minimum set MONGODB_URI and JWT_SECRET

# 4. Start in development mode
npm run dev
```

The client opens at **http://localhost:5173** and proxies API / WebSocket traffic to the server on port 5000.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server HTTP port |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `GEMINI_API_KEY` | No | _(empty = mock mode)_ | Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `MAX_REVIEW_LINES` | No | `300` | Max lines accepted for review |
| `REVIEW_COOLDOWN_SECONDS` | No | `15` | Seconds between reviews |

## Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Click **Create API key** and copy it.
3. Paste it into `server/.env` as `GEMINI_API_KEY=your_key_here`.
4. The app will automatically switch from mock mode to real AI reviews.

### If the model name is rejected

Some Gemini models rotate on the free tier. If you see _"The configured GEMINI_MODEL is not available"_:

1. Visit [AI Studio](https://aistudio.google.com/) and check which models are marked **Free**.
2. Update `GEMINI_MODEL` in your `.env` to match (e.g., `gemini-2.0-flash`, `gemini-1.5-flash`).

### Free-tier rate limits

The free tier has per-minute request limits. If you hit _"AI rate limit reached"_, wait ~60 seconds and try again.

> **Privacy note:** On the free tier, prompts may be used by Google to improve its products. **Do not paste private or proprietary code.**

## Testing Collaboration

1. Open **http://localhost:5173** in a normal browser window.
2. Open it again in an **incognito/private** window (or a different browser).
3. Register two different users, create a room with User A, join it with User B using the room code.
4. Type in both windows simultaneously — text merges conflict-free with named remote cursors.

## Socket Event Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ code }` | Join a room (must be a member) |
| `room:leave` | `{ code }` | Leave a room |
| `yjs:sync-request` | `{ code }` | Request full document state |
| `yjs:update` | `{ code, update }` | Send a Yjs document update |
| `awareness:update` | `{ code, update }` | Send awareness state |
| `review:request` | `{ code }` | Request an AI code review |
| `comment:status` | `{ reviewId, commentId, status }` | Change comment status |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `room:joined` | `{ room, users, latestReview }` | Confirms room entry |
| `presence:update` | `{ users }` | Updated user presence list |
| `yjs:sync` | `{ update }` | Full document state |
| `yjs:update` | `{ update }` | Incremental document update |
| `awareness:update` | `{ update }` | Remote awareness state |
| `review:started` | `{ reviewId, requestedBy, provider }` | Review has begun |
| `review:comment` | `{ reviewId, comment }` | Streamed review comment |
| `review:summary` | `{ reviewId, summary }` | Review summary |
| `review:done` | `{ reviewId }` | Review complete |
| `review:error` | `{ message }` | Review error |
| `comment:updated` | `{ reviewId, comment }` | Comment status changed |
| `app:error` | `{ message }` | General error |

## Resume Bullet Points

- Architected a real-time collaborative code review platform using **React 18**, **Express 4**, **Socket.io 4**, **Yjs 13**, **MongoDB**, and **Google Gemini**
- Implemented **conflict-free real-time collaborative editing (CRDT)** with Yjs over Socket.io, featuring multi-user cursors, awareness, and persistent document state
- Built a **streaming AI code review pipeline** with NDJSON parsing, rate limiting, cooldown enforcement, and graceful error handling for free-tier API constraints
- Designed a **room-based authentication system** with JWT verification on both REST and WebSocket layers, with per-event membership validation
- Created a **responsive dark-themed UI** with Monaco Editor, live presence indicators, streaming review comments with accept/dismiss workflow, and glyph decorations
