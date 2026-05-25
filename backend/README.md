# Backend — AI Agent Command Center API

FastAPI server that orchestrates agent missions, streams Claude responses via SSE, and writes artifacts to `/workspace`.

## Setup

```bash
# From project root (not backend/)

# 1. Python venv (recommended; skip if .venv/ already exists)
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies (macOS: bare `pip` may be missing — use venv pip or python3 -m pip)
.venv/bin/pip install -r backend/requirements.txt
# Optional MusicGen deps (torch/audiocraft are large — skip if you only need music21/MIDI)
# .venv/bin/pip install torch torchaudio audiocraft

# 3. Environment
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY (optional — without it, mock streaming is used)
```

## Run

Terminal 1 — Backend:
```bash
npm run dev:backend
# or: cd backend && uvicorn main:app --reload --port 8000
```

Terminal 2 — Frontend:
```bash
npm run dev
```

Vite proxies `/api/*` → `http://127.0.0.1:8000`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + Claude availability |
| POST | `/api/mission` | Start mission (SSE stream) |
| GET | `/api/workspace/{session_id}/{filename}` | Download generated file |

### SSE Event Types

- `session` — `{ sessionId }`
- `chat_start` / `chat_delta` / `chat_end` — streaming chat
- `status` — `{ agentId, status }`
- `assign` — `{ agentId, cardLabel }`
- `work` — `{ agentId, message, progress }`
- `artifact` — `{ agentId, filename, url, kind, title }`
- `briefing` — `{ results }`
- `done` — mission complete

## Workspace Output

Files are saved under:
```
workspace/{session_id}/
  music_generator.py
  track.mid
  score.musicxml
  score.pdf
  blog_post.md
  legal_report.md
```
