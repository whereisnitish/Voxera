# Voxera Frontend

React + Vite + TypeScript + Tailwind dashboard for the Voxera backend.

## Pages

- **/login**, **/signup** — auth (JWT stored in localStorage)
- **/** — dashboard (counts + recent calls + spend)
- **/agents** — list, create, edit, delete agents
- **/api-keys** — manage encrypted provider keys (STT / TTS / Telephony / LLM)
- **/calls** — call log + outbound dialing
- **/calls/:id** — transcript view (auto-refreshes during live calls)

## Run

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173. The Vite dev server proxies `/api/*` and `/api/stream/*` (WebSocket) to `http://localhost:8000`, so make sure the backend is running.

## Production build

```bash
npm run build
npm run preview
```

The build output is in `dist/`. In production, serve it from a static host (or a `/static` route on the FastAPI app) and point the API base via a reverse proxy.

## Notes

- Uses TanStack Query for server state — call detail and transcripts auto-poll while a call is `ringing`/`in_progress`.
- Auth is a tiny `AuthProvider` over `localStorage`. A 401 response from any API call clears the token and redirects to `/login`.
- Tailwind is configured with a dark palette (`bg`, `surface`, `border`, `muted`, `accent`) — adjust [tailwind.config.js](tailwind.config.js) to rebrand.
