from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, AsyncIterator

from . import claude, intent
from .orchestrator import run_mission

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CHAT_DIR = PROJECT_ROOT / "data" / "chat_sessions"

MAIN_CHAT_SYSTEM = """You are Main Agent (팀장), PM of an AI virtual office.
Respond naturally in Korean like a friendly colleague — NOT a task bot.

Rules:
- For greetings or small talk: greet back warmly. Do NOT say you are starting work or assigning tasks.
- For questions: answer helpfully in 1-3 sentences.
- Never say "작업을 진행합니다" unless the CEO explicitly confirmed a mission.
- Do NOT use markdown headers."""

MAIN_CONFIRM_SYSTEM = """You are Main Agent (팀장). The CEO gave a work request but has NOT confirmed yet.
Summarize what you understood in 2-3 bullet points (plain text, use • bullets).
End by asking ONE confirmation question in Korean, e.g. "이 요구사항이 맞을까요? 진행할까요?"
Do NOT start the pipeline. Do NOT say you are already working."""


def _ensure_chat_dir() -> None:
    CHAT_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(session_id: str) -> Path:
    return CHAT_DIR / f"{session_id}.json"


def load_session(session_id: str) -> dict[str, Any]:
    path = _session_path(session_id)
    if not path.exists():
        return {"sessionId": session_id, "messages": [], "pendingMission": None}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        data.setdefault("messages", [])
        data.setdefault("pendingMission", None)
        return data
    except (json.JSONDecodeError, TypeError):
        return {"sessionId": session_id, "messages": [], "pendingMission": None}


def load_history(session_id: str) -> list[dict[str, str]]:
    return load_session(session_id).get("messages", [])


def save_session(session_id: str, data: dict[str, Any]) -> None:
    _ensure_chat_dir()
    payload = {
        "sessionId": session_id,
        "messages": data.get("messages", [])[-40:],
        "pendingMission": data.get("pendingMission"),
    }
    _session_path(session_id).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _build_prompt(history: list[dict[str, str]], message: str) -> str:
    lines = []
    for entry in history[-12:]:
        role = "CEO" if entry["role"] == "user" else "Main Agent"
        lines.append(f"{role}: {entry['content']}")
    lines.append(f"CEO: {message}")
    lines.append("Main Agent:")
    return "\n".join(lines)


async def _stream_assistant_reply(
    *,
    mode: str,
    user_message: str,
    history: list[dict[str, str]],
) -> AsyncIterator[str | dict[str, Any]]:
    """Yields SSE strings; final yield is a dict marker is not used — collects via side channel."""
    message_id = str(uuid.uuid4())
    yield _sse({"type": "chat_start", "speaker": "main", "messageId": message_id})

    prompt = _build_prompt(history, user_message)
    system = MAIN_CONFIRM_SYSTEM if mode == "mission_proposal" else MAIN_CHAT_SYSTEM

    async for delta in claude.stream_main_reply(system, prompt, mode=mode, user_message=user_message):
        yield _sse({"type": "chat_delta", "messageId": message_id, "delta": delta})

    yield _sse({"type": "chat_end", "messageId": message_id})


async def _collect_reply(
    *,
    mode: str,
    user_message: str,
    history: list[dict[str, str]],
) -> tuple[str, list[str]]:
    """Stream chat events and return (full_reply_text, sse_events)."""
    message_id = str(uuid.uuid4())
    events: list[str] = [
        _sse({"type": "chat_start", "speaker": "main", "messageId": message_id}),
    ]
    parts: list[str] = []

    prompt = _build_prompt(history, user_message)
    system = MAIN_CONFIRM_SYSTEM if mode == "mission_proposal" else MAIN_CHAT_SYSTEM

    async for delta in claude.stream_main_reply(system, prompt, mode=mode, user_message=user_message):
        parts.append(delta)
        events.append(_sse({"type": "chat_delta", "messageId": message_id, "delta": delta}))

    events.append(_sse({"type": "chat_end", "messageId": message_id}))
    return "".join(parts), events


async def run_conversation(
    message: str,
    session_id: str | None = None,
    employee_ids: list[str] | None = None,
    force_mission: bool = False,
) -> AsyncIterator[str]:
    text = message.strip()
    if not text:
        yield _sse({"type": "error", "message": "message is required"})
        return

    sid = session_id or uuid.uuid4().hex[:12]
    session = load_session(sid)
    history: list[dict[str, str]] = session.get("messages", [])
    pending: str | None = session.get("pendingMission")

    history.append({"role": "user", "content": text})
    yield _sse({"type": "session", "sessionId": sid})

    interaction = intent.classify_interaction(text, has_pending_mission=bool(pending))

    if force_mission:
        interaction = "confirm_yes"
        pending = text

    yield _sse({"type": "status", "agentId": "main", "status": "THINKING"})

    # --- Confirmed mission → run pipeline ---
    if interaction == "confirm_yes" and pending:
        mission_command = pending
        full_reply = f"알겠습니다, CEO님. 「{mission_command}」 업무로 팀을 소집하겠습니다."
        message_id = str(uuid.uuid4())
        yield _sse({"type": "chat_start", "speaker": "main", "messageId": message_id})
        async for delta in claude.stream_text(full_reply):
            yield _sse({"type": "chat_delta", "messageId": message_id, "delta": delta})
        yield _sse({"type": "chat_end", "messageId": message_id})

        history.append({"role": "assistant", "content": full_reply})
        save_session(sid, {**session, "messages": history, "pendingMission": None})

        yield _sse({"type": "status", "agentId": "main", "status": "IDLE"})
        yield _sse({"type": "move", "agentId": "main", "zoneId": "meeting", "x": 26, "y": 6, "reason": "briefing"})
        yield _sse({
            "type": "action",
            "action": "run_pipeline",
            "command": mission_command,
            "message": "팀을 회의실로 소집하고 파이프라인을 시작합니다.",
        })
        yield _sse({"type": "move", "agentId": "all", "zoneId": "meeting", "reason": "standup"})

        async for event in run_mission(mission_command, employee_ids, chat_session_id=sid, skip_intro=True):
            yield event
        return

    # --- Cancel pending mission ---
    if interaction == "confirm_no":
        full_reply = "알겠습니다. 수정할 내용이 있으면 말씀해 주세요. 준비되면 다시 업무를 지시해 주시면 됩니다."
        message_id = str(uuid.uuid4())
        yield _sse({"type": "chat_start", "speaker": "main", "messageId": message_id})
        async for delta in claude.stream_text(full_reply):
            yield _sse({"type": "chat_delta", "messageId": message_id, "delta": delta})
        yield _sse({"type": "chat_end", "messageId": message_id})

        history.append({"role": "assistant", "content": full_reply})
        save_session(sid, {**session, "messages": history, "pendingMission": None})
        yield _sse({"type": "status", "agentId": "main", "status": "IDLE"})
        yield _sse({"type": "done"})
        return

    # --- Work request → ask confirmation ---
    if interaction == "mission_proposal":
        session["pendingMission"] = text
        yield _sse({"type": "move", "agentId": "main", "zoneId": "meeting", "x": 26, "y": 6, "reason": "briefing"})

        full_reply, events = await _collect_reply(
            mode="mission_proposal",
            user_message=text,
            history=history[:-1],
        )
        for event in events:
            yield event

        history.append({"role": "assistant", "content": full_reply})
        save_session(sid, {**session, "messages": history, "pendingMission": text})
        yield _sse({"type": "status", "agentId": "main", "status": "IDLE"})
        yield _sse({"type": "done"})
        return

    # --- Casual chat / greeting ---
    yield _sse({"type": "move", "agentId": "main", "zoneId": "ceo", "reason": "chat"})

    full_reply, events = await _collect_reply(
        mode="chat",
        user_message=text,
        history=history[:-1],
    )
    for event in events:
        yield event

    history.append({"role": "assistant", "content": full_reply})
    save_session(sid, {**session, "messages": history, "pendingMission": pending})
    yield _sse({"type": "status", "agentId": "main", "status": "IDLE"})
    yield _sse({"type": "done"})
