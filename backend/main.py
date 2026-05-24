from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from services.orchestrator import run_mission
from services.workspace import PROJECT_ROOT, WORKSPACE_ROOT, ensure_session_dir

load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(title="AI Agent Command Center API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MissionRequest(BaseModel):
    command: str


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "claude": bool(os.getenv("ANTHROPIC_API_KEY")),
        "workspace": str(WORKSPACE_ROOT),
    }


@app.post("/api/mission")
async def start_mission(body: MissionRequest):
    command = body.command.strip()
    if not command:
        raise HTTPException(status_code=400, detail="command is required")

    return StreamingResponse(
        run_mission(command),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/workspace/{session_id}/{filename}")
async def get_workspace_file(session_id: str, filename: str):
    base = ensure_session_dir(session_id).resolve()
    target = (base / filename).resolve()

    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=403, detail="invalid path")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")

    media_types = {
        ".mid": "audio/midi",
        ".pdf": "application/pdf",
        ".md": "text/markdown; charset=utf-8",
        ".py": "text/plain; charset=utf-8",
        ".xml": "application/xml",
        ".musicxml": "application/xml",
    }
    media_type = media_types.get(target.suffix.lower(), "application/octet-stream")
    return FileResponse(target, media_type=media_type, filename=filename)
