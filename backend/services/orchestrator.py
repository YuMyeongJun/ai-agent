from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, AsyncIterator

from . import claude, claude_design_export, intent
from .employees import get_active_employees, get_employee
from .role_templates import (
    PIPELINE_ORDER,
    get_template,
    infer_templates_for_command,
    resolve_template_id,
)
from . import task_workspace as workspace


MEETING_SLOTS = [(24.5, 5.5), (26.5, 5.5), (28.5, 5.5), (25.5, 7.2), (27.5, 7.2)]
PLAZA_CENTER = (20.0, 17.5)
LAB_SPOT = (35.5, 5.5)


def _zone_for_template(template_id: str, phase: str) -> tuple[float, float, str]:
    if phase == "report":
        return (*PLAZA_CENTER, "plaza")
    if template_id == "developer":
        return (6.5, 5.5, "open")
    if template_id == "designer":
        return (10.5, 5.5, "open")
    if template_id == "qa":
        return (*LAB_SPOT, "lab")
    return (26.5, 6.0, "meeting")


async def _emit_move(
    queue: asyncio.Queue[str | None],
    agent_id: str,
    *,
    x: float | None = None,
    y: float | None = None,
    zone_id: str = "",
    desk_id: str = "",
    reason: str = "",
) -> None:
    payload: dict[str, Any] = {"type": "move", "agentId": agent_id, "reason": reason}
    if x is not None:
        payload["x"] = x
    if y is not None:
        payload["y"] = y
    if zone_id:
        payload["zoneId"] = zone_id
    if desk_id:
        payload["deskId"] = desk_id
    await queue.put(_sse(payload))


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _card_label(employee: dict[str, Any]) -> str:
    template = get_template(resolve_template_id(employee))
    label = template["label"] if template else employee.get("role", "")
    return f"{employee['name']} · {label}"


def _work_message(employee: dict[str, Any]) -> str:
    template = get_template(resolve_template_id(employee))
    if template:
        return template["workMessage"]
    return f"{employee.get('role', 'AI')} 업무 처리 중..."


def _build_pipeline(
    command: str,
    employees: list[dict[str, Any]],
    explicit_selection: bool,
) -> list[dict[str, Any]]:
    if explicit_selection:
        return sorted(
            employees,
            key=lambda emp: (get_template(resolve_template_id(emp)) or {}).get("order", 99),
        )

    needed_templates = infer_templates_for_command(command)
    by_template: dict[str, dict[str, Any]] = {}
    for emp in employees:
        template_id = resolve_template_id(emp)
        if template_id not in by_template:
            by_template[template_id] = emp

    pipeline: list[dict[str, Any]] = []
    for template_id in PIPELINE_ORDER:
        if template_id not in needed_templates:
            continue
        emp = by_template.get(template_id)
        if emp:
            pipeline.append(emp)
    return pipeline


async def _emit_dialogue(
    queue: asyncio.Queue[str | None],
    *,
    from_agent_id: str,
    to_agent_id: str,
    from_name: str,
    to_name: str,
    content: str,
    context: str = "meeting",
    stage: int | None = None,
) -> None:
    await queue.put(
        _sse({
            "type": "dialogue",
            "fromAgentId": from_agent_id,
            "toAgentId": to_agent_id,
            "fromName": from_name,
            "toName": to_name,
            "content": content,
            "context": context,
            "stage": stage,
        })
    )


async def _emit_chat(
    queue: asyncio.Queue[str | None],
    speaker: str,
    mock_key: str,
    user_prompt: str,
    role_template_id: str | None = None,
) -> str:
    message_id = str(uuid.uuid4())
    full_text = ""

    await queue.put(_sse({"type": "chat_start", "speaker": speaker, "messageId": message_id}))

    async for delta in claude.stream_agent_message(speaker, mock_key, user_prompt, role_template_id):
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


async def _run_chat(command: str, queue: asyncio.Queue[str | None]) -> None:
    await queue.put(_sse({"type": "intent", "intent": "chat"}))
    await queue.put(_sse({"type": "status", "agentId": "main", "status": "THINKING"}))
    await _emit_chat(queue, "main", "main_greeting", f"CEO message: {command}")
    await queue.put(_sse({"type": "status", "agentId": "main", "status": "IDLE"}))
    await queue.put(_sse({"type": "done"}))


def _resolve_employees(employee_ids: list[str] | None) -> list[dict[str, Any]]:
    if employee_ids:
        resolved = []
        for emp_id in employee_ids:
            emp = get_employee(emp_id)
            if emp and emp.get("active", True):
                resolved.append(emp)
        if resolved:
            return resolved
    return get_active_employees()


async def run_mission(
    command: str,
    employee_ids: list[str] | None = None,
    chat_session_id: str | None = None,
    skip_intro: bool = False,
) -> AsyncIterator[str]:
    session_id = chat_session_id or uuid.uuid4().hex[:12]
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    all_artifacts: list[dict] = []
    command_intent = intent.classify_command(command)
    employees = _resolve_employees(employee_ids)
    explicit_selection = bool(employee_ids)
    pipeline = _build_pipeline(command, employees, explicit_selection)

    async def producer() -> None:
        try:
            if command_intent == "chat" and not skip_intro:
                await _run_chat(command, queue)
                return

            if not pipeline:
                await queue.put(
                    _sse({
                        "type": "error",
                        "message": "파이프라인에 참여할 직원이 없습니다. 기획·개발·디자인·리뷰·QA 역할을 고용해 주세요.",
                    })
                )
                return

            await queue.put(_sse({"type": "intent", "intent": "mission"}))
            if not chat_session_id:
                await queue.put(_sse({"type": "session", "sessionId": session_id}))

            stage_payload = []
            for emp in pipeline:
                template_id = resolve_template_id(emp)
                template = get_template(template_id) or {}
                stage_payload.append({
                    "employeeId": emp["id"],
                    "employeeName": emp["name"],
                    "roleTemplateId": template_id,
                    "roleLabel": template.get("label", emp.get("role", "")),
                    "order": template.get("order", 99),
                })
            await queue.put(_sse({"type": "pipeline", "stages": stage_payload}))

            # Team gathers in meeting room
            for i, emp in enumerate(pipeline):
                mx, my = MEETING_SLOTS[i % len(MEETING_SLOTS)]
                await _emit_move(
                    queue, emp["id"], x=mx, y=my, zone_id="meeting", reason="standup"
                )
            await _emit_move(queue, "main", x=26.5, y=4.8, zone_id="meeting", reason="standup")

            team_names = ", ".join(emp["name"] for emp in pipeline)
            standup_text = await claude.generate_dialogue(
                "Main Agent",
                team_names,
                "main",
                "team",
                f"CEO mission standup: {command}. Team: {team_names}",
            )
            await _emit_dialogue(
                queue,
                from_agent_id="main",
                to_agent_id="team",
                from_name="Main Agent",
                to_name=team_names,
                content=standup_text,
                context="standup",
            )

            if not skip_intro:
                await queue.put(_sse({"type": "status", "agentId": "main", "status": "THINKING"}))
                await _emit_chat(queue, "main", "main_ack", f"CEO command: {command}")
                await _emit_chat(
                    queue,
                    "main",
                    "main_plan",
                    f"Plan pipeline for: {command}. Stages: {[s['roleLabel'] for s in stage_payload]}",
                )

            prior_context = ""
            stage_artifacts: list[dict] = []

            for index, employee in enumerate(pipeline, start=1):
                agent_id = employee["id"]
                template_id = resolve_template_id(employee)
                template = get_template(template_id) or {}

                await queue.put(
                    _sse({
                        "type": "assign",
                        "agentId": agent_id,
                        "cardLabel": _card_label(employee),
                        "stage": index,
                        "stageTotal": len(pipeline),
                        "roleTemplateId": template_id,
                    })
                )
                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "WORKING"}))

                wx, wy, wzone = _zone_for_template(template_id, "work")
                desk = employee.get("deskId", "")
                if template_id in ("developer", "designer") and desk:
                    await _emit_move(queue, agent_id, desk_id=desk, zone_id="open", reason="work")
                else:
                    await _emit_move(queue, agent_id, x=wx, y=wy, zone_id=wzone, reason="work")

                delegate_text = await claude.generate_dialogue(
                    "Main Agent",
                    employee["name"],
                    "main",
                    template_id,
                    f"Delegate stage {index}/{len(pipeline)} ({template.get('label', '')}): {command}",
                )
                await _emit_dialogue(
                    queue,
                    from_agent_id="main",
                    to_agent_id=agent_id,
                    from_name="Main Agent",
                    to_name=employee["name"],
                    content=delegate_text,
                    context="meeting",
                    stage=index,
                )

                user_prompt = (
                    f"Mission: {command}\n"
                    f"Your role: {template.get('label', employee.get('role', ''))} ({template.get('labelEn', '')})\n"
                    f"Pipeline stage: {index} of {len(pipeline)}\n"
                )
                if prior_context and template.get("needsPriorContext", index > 1):
                    user_prompt += f"\nPrior deliverables from earlier stages:\n{prior_context}\n"
                user_prompt += "\nBriefly confirm your plan for this stage."

                work_task = asyncio.create_task(
                    _emit_work_progress(queue, agent_id, _work_message(employee), duration=2.8)
                )
                confirm_text = await claude.generate_dialogue(
                    employee["name"],
                    "Main Agent",
                    template_id,
                    "main",
                    user_prompt,
                )
                await _emit_dialogue(
                    queue,
                    from_agent_id=agent_id,
                    to_agent_id="main",
                    from_name=employee["name"],
                    to_name="Main Agent",
                    content=confirm_text,
                    context="meeting",
                    stage=index,
                )
                await work_task

                deliverable_contents: dict[str, str] = {}
                for spec in template.get("deliverables", []):
                    generator = spec.get("generator", spec["suffix"])
                    if generator in deliverable_contents:
                        continue
                    deliverable_contents[generator] = await claude.generate_deliverable_content(
                        template_id,
                        {**spec, "suffix": generator},
                        command,
                        prior_context,
                    )

                artifacts = workspace.create_deliverable(
                    session_id,
                    agent_id,
                    command,
                    template_id,
                    prior_context=prior_context,
                    deliverable_contents=deliverable_contents,
                )
                if template_id == "designer":
                    # mockup notes still generated for Claude Design HTML context
                    if "mockup" not in deliverable_contents:
                        deliverable_contents["mockup"] = await claude.generate_deliverable_content(
                            template_id,
                            {"suffix": "mockup", "title": "UI Mockup"},
                            command,
                            prior_context,
                        )
                    claude_design_artifacts = await claude_design_export.export_claude_design(
                        session_id,
                        agent_id,
                        command,
                        deliverable_contents,
                        prior_context,
                    )
                    artifacts.extend(claude_design_artifacts)
                stage_artifacts.extend(artifacts)
                all_artifacts.extend(artifacts)
                for artifact in artifacts:
                    await queue.put(_sse({"type": "artifact", **artifact}))

                prior_context = workspace.read_artifact_context(session_id, stage_artifacts)

                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "REPORTING"}))
                rx, ry, rzone = _zone_for_template(template_id, "report")
                await _emit_move(queue, agent_id, x=rx, y=ry, zone_id=rzone, reason="report")
                report_text = await claude.generate_dialogue(
                    employee["name"],
                    "Main Agent",
                    template_id,
                    "main",
                    f"Report stage {index} completion for: {command}",
                )
                await _emit_dialogue(
                    queue,
                    from_agent_id=agent_id,
                    to_agent_id="main",
                    from_name=employee["name"],
                    to_name="Main Agent",
                    content=report_text,
                    context="handoff",
                    stage=index,
                )
                await _emit_move(
                    queue, agent_id,
                    x=MEETING_SLOTS[(index - 1) % len(MEETING_SLOTS)][0],
                    y=MEETING_SLOTS[(index - 1) % len(MEETING_SLOTS)][1],
                    zone_id="meeting",
                    reason="handoff",
                )
                await queue.put(_sse({"type": "status", "agentId": agent_id, "status": "IDLE"}))
                # Return to desk when idle
                if employee.get("deskId"):
                    await _emit_move(queue, agent_id, desk_id=employee["deskId"], reason="idle")

            workspace.save_task_meta(
                session_id,
                command,
                [emp["id"] for emp in pipeline],
                [resolve_template_id(emp) for emp in pipeline],
            )

            await queue.put(_sse({"type": "status", "agentId": "main", "status": "REPORTING"}))
            await _emit_chat(queue, "main", "main_briefing", f"Summarize pipeline results for CEO: {command}")

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
    icon_map = {"code": "💻", "markdown": "📝", "json": "📋"}

    for artifact in artifacts:
        filename = artifact["filename"]
        kind = artifact["kind"]
        path = workspace.ensure_session_dir(session_id) / filename
        content = ""
        if path.exists() and kind in {"code", "markdown"}:
            content = path.read_text(encoding="utf-8")[:800]

        results.append({
            "id": filename,
            "agentId": artifact["agentId"],
            "title": artifact["title"],
            "subtitle": filename,
            "icon": icon_map.get(kind, "📁"),
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
