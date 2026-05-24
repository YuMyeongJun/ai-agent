from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, AsyncIterator

from . import claude, intent, workspace

AGENTS = ["musicDev", "score", "marketer", "legal"]

WORK_MESSAGES = {
    "musicDev": "코드를 작성 중입니다...",
    "score": "MIDI → MusicXML 변환 중...",
    "marketer": "블로그 포스팅 초안을 잡는 중입니다...",
    "legal": "저작권 리스크 검토 중...",
}

CARD_LABELS = {
    "musicDev": "Music Pipeline",
    "score": "Score Export",
    "marketer": "Blog Draft",
    "legal": "Legal Audit",
}

MOCK_DELEGATE = {
    "musicDev": "main_delegate_music",
    "score": "main_delegate_score",
    "marketer": "main_delegate_marketer",
    "legal": "main_delegate_legal",
}


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def _emit_chat(
    queue: asyncio.Queue[str | None],
    speaker: str,
    mock_key: str,
    user_prompt: str,
) -> str:
    message_id = str(uuid.uuid4())
    full_text = ""

    await queue.put(_sse({"type": "chat_start", "speaker": speaker, "messageId": message_id}))

    async for delta in claude.stream_agent_message(speaker, mock_key, user_prompt):
        full_text += delta
        await queue.put(_sse({"type": "chat_delta", "messageId": message_id, "delta": delta}))

    await queue.put(_sse({"type": "chat_end", "messageId": message_id}))
    return full_text


async def _emit_work_progress(
    queue: asyncio.Queue[str | None],
    agent_id: str,
    message: str,
    duration: float = 2.5,
) -> None:
    steps = 20
    for step in range(steps + 1):
        progress = min(int((step / steps) * 100), 100)
        await queue.put(
            _sse({"type": "work", "agentId": agent_id, "message": message, "progress": progress})
        )
        await asyncio.sleep(duration / steps)


async def _create_artifacts(session_id: str, agent_id: str, mission: str, ai_text: str) -> list[dict]:
    artifacts: list[dict] = []

    if agent_id == "musicDev":
        workspace.create_music_code(session_id, mission)
        workspace.create_minimal_midi(session_id)
        artifacts.extend([
            workspace.artifact_meta(session_id, agent_id, "music_generator.py", "code", "Python Generator"),
            workspace.artifact_meta(session_id, agent_id, "track.mid", "midi", "MIDI Track"),
        ])
    elif agent_id == "score":
        workspace.create_musicxml(session_id, mission)
        workspace.create_score_pdf(session_id, mission)
        artifacts.extend([
            workspace.artifact_meta(session_id, agent_id, "score.musicxml", "xml", "MusicXML"),
            workspace.artifact_meta(session_id, agent_id, "score.pdf", "pdf", "Score PDF"),
        ])
    elif agent_id == "marketer":
        workspace.create_blog_post(session_id, mission, ai_text or None)
        artifacts.append(
            workspace.artifact_meta(session_id, agent_id, "blog_post.md", "markdown", "Blog Draft")
        )
    elif agent_id == "legal":
        workspace.create_legal_report(session_id, mission, ai_text or None)
        artifacts.append(
            workspace.artifact_meta(session_id, agent_id, "legal_report.md", "markdown", "Legal Report")
        )

    return artifacts


async def _run_chat(command: str, queue: asyncio.Queue[str | None]) -> None:
    await queue.put(_sse({"type": "intent", "intent": "chat"}))
    await queue.put(_sse({"type": "status", "agentId": "main", "status": "THINKING"}))
    await _emit_chat(queue, "main", "main_greeting", f"CEO message: {command}")
    await queue.put(_sse({"type": "status", "agentId": "main", "status": "IDLE"}))
    await queue.put(_sse({"type": "done"}))


async def run_mission(command: str) -> AsyncIterator[str]:
    session_id = uuid.uuid4().hex[:12]
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    all_artifacts: list[dict] = []
    command_intent = intent.classify_command(command)

    async def producer() -> None:
        try:
            if command_intent == "chat":
                await _run_chat(command, queue)
                return

            await queue.put(_sse({"type": "intent", "intent": "mission"}))
            await queue.put(_sse({"type": "session", "sessionId": session_id}))

            await queue.put(_sse({"type": "status", "agentId": "main", "status": "THINKING"}))
            await _emit_chat(queue, "main", "main_ack", f"CEO command: {command}")

            for agent_id in AGENTS:
                await queue.put(
                    _sse({"type": "assign", "agentId": agent_id, "cardLabel": CARD_LABELS[agent_id]})
                )
                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "WORKING"}))

                await _emit_chat(queue, "main", MOCK_DELEGATE[agent_id], f"Delegate to {agent_id}: {command}")

                work_task = asyncio.create_task(
                    _emit_work_progress(queue, agent_id, WORK_MESSAGES[agent_id], duration=2.8)
                )
                agent_text = await _emit_chat(
                    queue,
                    agent_id,
                    agent_id,
                    f"Mission: {command}. Briefly confirm your plan.",
                )
                await work_task

                artifacts = await _create_artifacts(session_id, agent_id, command, agent_text)
                all_artifacts.extend(artifacts)
                for artifact in artifacts:
                    await queue.put(_sse({"type": "artifact", **artifact}))

                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "REPORTING"}))
                await _emit_chat(queue, agent_id, f"{agent_id}_report", f"Report completion for: {command}")
                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "IDLE"}))

            await queue.put(_sse({"type": "status", "agentId": "main", "status": "REPORTING"}))
            await _emit_chat(queue, "main", "main_briefing", f"Summarize mission results for CEO: {command}")

            briefing = _build_briefing(session_id, command, all_artifacts)
            await queue.put(_sse({"type": "briefing", "results": briefing}))
            await queue.put(_sse({"type": "status", "agentId": "main", "status": "IDLE"}))
            await queue.put(_sse({"type": "done"}))
        except Exception as exc:
            await queue.put(_sse({"type": "error", "message": str(exc)}))
        finally:
            await queue.put(None)

    asyncio.create_task(producer())

    while True:
        item = await queue.get()
        if item is None:
            break
        yield item


def _build_briefing(session_id: str, mission: str, artifacts: list[dict]) -> list[dict]:
    results = []
    for artifact in artifacts:
        filename = artifact["filename"]
        kind = artifact["kind"]
        path = workspace.ensure_session_dir(session_id) / filename
        content = ""
        if path.exists() and kind in {"code", "markdown", "xml"}:
            content = path.read_text(encoding="utf-8")[:800]
        elif kind == "pdf":
            content = f"PDF generated at {artifact['url']}"
        elif kind == "midi":
            content = f"MIDI file ready: {artifact['url']}"

        results.append({
            "id": filename,
            "agentId": artifact["agentId"],
            "title": artifact["title"],
            "subtitle": filename,
            "icon": {"code": "🎹", "midi": "🎵", "pdf": "🎼", "markdown": "📝", "xml": "📄"}.get(kind, "📁"),
            "type": kind if kind in {"code", "markdown"} else "file",
            "tag": "ready",
            "content": content,
            "url": artifact["url"],
            "kind": kind,
        })

    if not results:
        results.append({
            "id": "summary",
            "title": "Mission Summary",
            "subtitle": mission,
            "icon": "📊",
            "type": "text",
            "tag": "done",
            "content": f"Mission '{mission}' completed in session {session_id}.",
            "kind": "text",
        })

    return results
