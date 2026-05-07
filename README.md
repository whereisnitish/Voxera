# Voxera

A production-grade **Voice AI platform** — sign up, plug in your provider keys (STT, TTS, telephony, LLM), define a voice agent (prompt, voice, behavior), and connect it to a phone number. Voxera runs the real-time `audio → STT → LLM → TTS → audio` loop, persists transcripts and usage, and surfaces it all in a polished dashboard.

The repo ships with **two pieces** that are designed to run together:

| Piece | Stack | Lives in |
|---|---|---|
| **Backend** | FastAPI · async SQLAlchemy · Postgres · Redis · Celery · WebSockets | [`app/`](app/), [`workers/`](workers/) |
| **Frontend** | React · Vite · TypeScript · Tailwind · TanStack Query | [`frontend/`](frontend/) |

A single script, [`dev.sh`](dev.sh), boots everything in one command.

---

## Architecture

```
                ┌──────────────────────────────┐
                │       Frontend (Vite)        │  http://localhost:5173
                │   Dashboard · Agents · Keys  │  (light/dark/system theme)
                │       Calls · Transcripts    │
                └──────────────┬───────────────┘
                               │  REST + WS  (proxied via /api → :8000)
                               ▼
                ┌──────────────────────────────┐
                │      FastAPI (app/main.py)   │  http://localhost:8000
                │   Auth · CRUD · Webhooks     │
                └──────────────┬───────────────┘
                               │
   Twilio ── webhook ──▶  /api/telephony/twilio/incoming-call
                               │  returns TwiML <Stream url=ws://…/api/stream/{call_id}>
                               ▼
                ┌──────────────────────────────┐
   Twilio ── ws ──▶          │       Orchestrator           │  per-call session
                │  app/services/orchestrator.py│
                └──┬────────┬────────┬─────────┘
                   │        │        │
              ┌────▼──┐  ┌──▼───┐  ┌─▼────────┐
              │  STT  │  │ LLM  │  │   TTS    │
              │ (DG)  │  │ (OAI)│  │  (11Labs)│
              └───────┘  └──────┘  └──────────┘
                       provider abstractions (app/providers/)
                               │
                               ▼
              Postgres  ◀──  Celery worker (cost rollups)
```

### Key design choices

- **Provider abstraction** — `STTProvider`, `TTSProvider`, `TelephonyProvider` are abstract bases. Implementations live in [`app/providers/{stt,tts,telephony}/`](app/providers/). A central [`registry.py`](app/providers/registry.py) maps names → classes so adding a new provider is a one-line registry change.
- **Async-first** — all I/O is async (FastAPI, SQLAlchemy 2.x async, httpx, Deepgram async client).
- **Encrypted user keys** — third-party API keys are encrypted at rest with Fernet (AES-128-CBC + HMAC) and decrypted only at call time, in memory.
- **Sentence-level TTS flushing** — LLM tokens are streamed; the orchestrator flushes to TTS at sentence boundaries for low-latency speech.
- **Barge-in** — incoming user speech cancels in-flight TTS playback.
- **Themed UI** — light / dark / system, with a no-flash pre-paint script and CSS-variable-based palette.

---

## Project layout

```
voxera/
├── app/                                 # ── Backend (FastAPI) ──
│   ├── main.py                          # FastAPI factory, router wiring, CORS
│   ├── core/
│   │   ├── config.py                    # pydantic-settings (.env)
│   │   ├── security.py                  # JWT + bcrypt password hashing
│   │   └── encryption.py                # Fernet for user-supplied API keys
│   ├── api/
│   │   ├── deps.py                      # auth dependency (Bearer JWT)
│   │   └── routes/
│   │       ├── auth.py                  # signup, login (OAuth2 password flow)
│   │       ├── api_keys.py              # CRUD for encrypted provider keys
│   │       ├── agents.py                # CRUD for voice agents
│   │       ├── calls.py                 # call list, detail, outbound dial
│   │       ├── telephony.py             # Twilio inbound webhook → TwiML
│   │       └── stream.py                # WS endpoint /api/stream/{call_id}
│   ├── services/
│   │   ├── orchestrator.py              # WS ↔ STT ↔ LLM ↔ TTS loop
│   │   └── agent_engine.py              # streaming LLM conversation engine
│   ├── providers/
│   │   ├── registry.py                  # name → class map
│   │   ├── stt/{base.py, deepgram.py}
│   │   ├── tts/{base.py, elevenlabs.py}
│   │   └── telephony/{base.py, twilio.py}
│   ├── db/                              # async SQLAlchemy session + ORM models
│   └── schemas/                         # pydantic request/response models
│
├── workers/                             # ── Celery ──
│   ├── celery_app.py                    # broker/backend wiring (Redis)
│   └── tasks.py                         # finalize_call (cost rollup)
│
├── frontend/                            # ── React dashboard ──
│   ├── src/
│   │   ├── App.tsx                      # router + providers
│   │   ├── lib/
│   │   │   ├── api.ts                   # fetch wrapper, JWT, 401 redirect
│   │   │   ├── auth.tsx                 # AuthProvider + useAuth
│   │   │   ├── theme.tsx                # ThemeProvider (light/dark/system)
│   │   │   ├── format.ts                # cost / duration / relative-time helpers
│   │   │   └── queryClient.ts           # TanStack Query defaults
│   │   ├── components/                  # Layout, AuthShell, Brand, Badge, Empty, Skeleton, ThemeToggle, …
│   │   └── pages/                       # Login, Signup, Dashboard, Agents, AgentForm, ApiKeys, Calls, CallDetail
│   ├── index.html                       # pre-paint theme bootstrap
│   ├── tailwind.config.js               # CSS-variable color tokens
│   ├── vite.config.ts                   # /api proxy to :8000 (REST + WS)
│   └── README.md                        # frontend-specific notes
│
├── alembic/                             # async migrations
├── docker/Dockerfile
├── docker-compose.yml                   # db, redis, api, worker
├── dev.sh                               # one-command local dev (backend + frontend)
└── requirements.txt
```

---

## Quick start

### 1. Generate secrets

```bash
cp .env.example .env

# Fernet key (used to encrypt user-supplied API keys at rest)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# JWT signing key
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste both into `.env` (`ENCRYPTION_KEY` and `SECRET_KEY`). Optionally set `OPENAI_API_KEY` if you want a default LLM key — otherwise users add their own through the dashboard.

### 2. Boot everything

```bash
./dev.sh
```

This single command:

- verifies Docker / Node / npm
- generates the initial Alembic migration on first run
- starts the Docker stack — Postgres, Redis, FastAPI (with auto-applied migrations), Celery worker
- waits for `/health` to be ready
- installs frontend deps if `node_modules` is missing
- starts Vite on port 5173
- streams `[backend]` and `[frontend]` logs interleaved with prefixes
- on `Ctrl+C`, kills the frontend and runs `docker compose down`

When it's up:

| URL | What |
|---|---|
| http://localhost:5173 | Frontend dashboard |
| http://localhost:8000 | API |
| http://localhost:8000/docs | OpenAPI / Swagger UI |
| http://localhost:8000/health | health check |

### Backend only

```bash
docker compose up --build
```

### Frontend only (against an already-running backend)

```bash
cd frontend
npm install
npm run dev
```

---

## Using the dashboard

1. **Sign up** — creates a workspace; auth is JWT in `localStorage`.
2. **Add API keys** — Settings → API Keys. One per provider you intend to use:
   - `stt` → `deepgram`
   - `tts` → `elevenlabs`
   - `telephony` → `twilio` (also fill the **Account SID** field)
   - `llm` → `openai`
   Keys are encrypted at rest with Fernet and only decrypted in-memory at call time.
3. **Create an agent** — Agents → New agent. Set name, system prompt, greeting, voice id, providers.
4. **Place a call**:
   - **Outbound** — Calls → "Place outbound call" → pick agent, fill from/to numbers.
   - **Inbound** — point your Twilio number's voice webhook at `https://<your-public-host>/api/telephony/twilio/incoming-call`, then associate the number with an agent in the `phone_numbers` table.
5. **Watch the call live** — the call detail page auto-refreshes the transcript every 2 seconds while the call is in progress, with chat-style bubbles for agent vs. user turns.

### Twilio + ngrok (for inbound)

Twilio needs to reach your machine over public HTTPS:

```bash
ngrok http 8000
# Update PUBLIC_BASE_URL in .env to https://<your-ngrok>.ngrok.app
docker compose restart api
```

Then in the Twilio console → your number → **A call comes in** → set the webhook to:

```
POST https://<your-ngrok>.ngrok.app/api/telephony/twilio/incoming-call
```

---

## Adding a new provider

1. Implement the abstract base — [`STTProvider`](app/providers/stt/base.py), [`TTSProvider`](app/providers/tts/base.py), or [`TelephonyProvider`](app/providers/telephony/base.py).
2. Register the class in [`app/providers/registry.py`](app/providers/registry.py).
3. (Frontend) add the provider name to the relevant `KIND_PROVIDERS` map in [`frontend/src/pages/ApiKeys.tsx`](frontend/src/pages/ApiKeys.tsx) so users can select it.

That's it — no orchestrator or route changes needed. The agent's `stt_provider` / `tts_provider` / `telephony_provider` field selects it at call time.

---

## API quick reference

```bash
# Sign up
curl -X POST localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"hunter2hunter2"}'

# Login (form-encoded — OAuth2 password flow)
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -d "username=you@example.com&password=hunter2hunter2" | jq -r .access_token)

# Add a key
curl -X POST localhost:8000/api/api-keys \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"kind":"llm","provider":"openai","api_key":"sk-..."}'

# Create an agent
curl -X POST localhost:8000/api/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Receptionist","system_prompt":"You are friendly. Keep it short.","greeting":"Hi!"}'

# Place an outbound call
curl -X POST localhost:8000/api/calls/outbound \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"agent_id":"<uuid>","to":"+15551234567","from_":"+15557654321"}'

# Inspect transcripts
curl localhost:8000/api/calls/<call_id>/transcripts \
  -H "Authorization: Bearer $TOKEN"
```

Full schema is browsable at `/docs`.

---

## Tech stack

**Backend** — Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2.x async · asyncpg · Alembic · Celery · Redis · httpx · python-jose · bcrypt · cryptography (Fernet)

**Providers** — `deepgram-sdk` (STT, async live) · `elevenlabs` REST stream · `twilio` REST + Media Streams · `openai` async streaming chat

**Frontend** — React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3 · TanStack Query 5 · React Router 6 · lucide-react · clsx

**Infra** — Docker Compose · Postgres 16 · Redis 7

---

## Roadmap

| Phase | Scope |
|---|---|
| **MVP (this repo)** | Twilio + Deepgram + ElevenLabs + OpenAI · single agent flow · dashboard · transcripts · cost rollup |
| **Phase 2** | Whisper STT, Cartesia TTS, multi-provider switching at call time, analytics, admin number-routing UI |
| **Phase 3** | Tool calling, long-term per-caller memory, CRM integrations, browser-side WebRTC widget for website embeds |

---

## Security notes

- **API keys at rest** — encrypted with Fernet (`ENCRYPTION_KEY`). Rotating the key requires a re-encryption migration; do not change it in place.
- **Auth** — JWT signed with `SECRET_KEY` (HS256). 401 from any API call clears the frontend token and redirects to `/login`.
- **Twilio webhook signing** — production deployments should validate the `X-Twilio-Signature` header on `/telephony/twilio/incoming-call`. Not yet wired — TODO.
- **CORS** — `app/main.py` reads `CORS_ORIGINS` from env. The Vite dev proxy (`/api → :8000`) means same-origin in dev, so CORS is largely a production concern.
- **Bcrypt 72-byte limit** — `app/core/security.py` truncates passwords to 72 bytes to make hash/verify symmetric and avoid the `ValueError` modern bcrypt raises on longer input.

---

## License & contributing

This is an internal scaffold — adapt freely. PRs welcome on the abstraction surfaces (new providers, new telephony bridges, the orchestrator pipeline).
