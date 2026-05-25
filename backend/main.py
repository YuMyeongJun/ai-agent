from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from services.employees import (
    create_employee,
    delete_employee,
    load_employees,
    update_employee,
)
from services.conversation import load_history, run_conversation
from services.orchestrator import run_mission
from services.role_templates import list_templates
from services.task_workspace import PROJECT_ROOT, WORKSPACE_ROOT, ensure_session_dir, list_artifacts
from services.figma_client import get_figma_config
from services.claude import claude_runtime_status

SESSION_ID_PATTERN = re.compile(r"^[a-f0-9]{12}$")

load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(title="AI Office API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    employeeIds: Optional[list[str]] = None
    forceMission: bool = False


class MissionRequest(BaseModel):
    command: str
    employeeIds: Optional[list[str]] = None


class EmployeeCreate(BaseModel):
    name: str
    role: str = "AI Employee"
    roleTemplateId: str = "developer"
    emoji: str = "🤖"
    deskId: str = ""
    skills: list[str] = Field(default_factory=list)
    active: bool = True
    color: str = "#6b9bd1"


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    roleTemplateId: Optional[str] = None
    emoji: Optional[str] = None
    deskId: Optional[str] = None
    skills: Optional[list[str]] = None
    active: Optional[bool] = None
    color: Optional[str] = None


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "claude": claude_runtime_status(),
        "figma": get_figma_config(),
        "claudeDesign": {
            "url": os.getenv("CLAUDE_DESIGN_URL", "https://claude.ai/design"),
            "integrated": True,
        },
        "workspace": str(WORKSPACE_ROOT),
        "employees": len(load_employees()),
    }


@app.get("/api/figma/status")
async def figma_status():
    return get_figma_config()


@app.get("/api/role-templates")
async def get_role_templates():
    return {"templates": list_templates()}


@app.get("/api/employees")
async def list_employees():
    return {"employees": load_employees()}


@app.post("/api/employees")
async def add_employee(body: EmployeeCreate):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    employee = create_employee(body.model_dump())
    return employee


@app.put("/api/employees/{employee_id}")
async def patch_employee(employee_id: str, body: EmployeeUpdate):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = update_employee(employee_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="employee not found")
    return updated


@app.delete("/api/employees/{employee_id}")
async def remove_employee(employee_id: str):
    if employee_id == "main":
        raise HTTPException(status_code=400, detail="cannot delete main agent")
    if not delete_employee(employee_id):
        raise HTTPException(status_code=404, detail="employee not found")
    return {"ok": True}


@app.get("/api/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=403, detail="invalid session id")
    messages = load_history(session_id)
    return {"sessionId": session_id, "messages": messages}


@app.get("/api/tasks/{session_id}/artifacts")
async def get_task_artifacts(session_id: str):
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=403, detail="invalid session id")
    session_dir = ensure_session_dir(session_id)
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="task not found")

    task_meta = None
    task_path = session_dir / "task.json"
    if task_path.exists():
        import json

        try:
            task_meta = json.loads(task_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, TypeError):
            task_meta = None

    return {
        "sessionId": session_id,
        "mission": (task_meta or {}).get("mission"),
        "status": (task_meta or {}).get("status", "in_progress"),
        "artifacts": list_artifacts(session_id),
    }


@app.post("/api/chat")
async def chat_with_office(body: ChatRequest):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    return StreamingResponse(
        run_conversation(
            message,
            session_id=body.sessionId,
            employee_ids=body.employeeIds,
            force_mission=body.forceMission,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/mission")
async def start_mission(body: MissionRequest):
    command = body.command.strip()
    if not command:
        raise HTTPException(status_code=400, detail="command is required")

    return StreamingResponse(
        run_mission(command, body.employeeIds),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/library")
async def list_workspace_library():
    sessions = []
    if not WORKSPACE_ROOT.exists():
        return {"sessions": []}

    entries = [
        entry
        for entry in WORKSPACE_ROOT.iterdir()
        if entry.is_dir() and SESSION_ID_PATTERN.match(entry.name)
    ]
    entries.sort(key=lambda path: path.stat().st_mtime, reverse=True)

    for entry in entries[:30]:
        task_path = entry / "task.json"
        if not task_path.exists():
            md_files = list(entry.glob("*_*.md")) + list(entry.glob("*_report.md"))
            if not md_files:
                continue

        title = entry.name
        if task_path.exists():
            import json

            try:
                meta = json.loads(task_path.read_text(encoding="utf-8"))
                title = meta.get("mission", title)[:100]
            except (json.JSONDecodeError, TypeError):
                pass

        artifact_count = len(list(entry.glob("*.*")))
        sessions.append(
            {
                "sessionId": entry.name,
                "title": title[:100],
                "artifactCount": artifact_count,
                "updatedAt": int(entry.stat().st_mtime),
            }
        )

    return {"sessions": sessions}


@app.get("/api/workspace/{session_id}/{filename}")
async def get_workspace_file(session_id: str, filename: str):
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=403, detail="invalid session id")
    base = ensure_session_dir(session_id).resolve()
    target = (base / filename).resolve()

    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=403, detail="invalid path")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")

    media_types = {
        ".pdf": "application/pdf",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".md": "text/markdown; charset=utf-8",
        ".py": "text/plain; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = media_types.get(target.suffix.lower(), "application/octet-stream")
    return FileResponse(target, media_type=media_type, filename=filename)
