from __future__ import annotations

import json
import os
import re
from typing import Any

from . import claude
from .deliverable_export import export_ui_mockup_html
from .task_workspace import artifact_meta, write_text

CLAUDE_DESIGN_URL = os.getenv("CLAUDE_DESIGN_URL", "https://claude.ai/design")

DESIGN_HTML_SYSTEM = """You are Claude Design — generate polished, production-quality UI as a standalone HTML file.

Rules:
- Output ONLY complete HTML (<!DOCTYPE html> ... </html>), no markdown fences, no explanation.
- Embed all CSS in <style>; no external CDN required (system fonts OK).
- Modern layout: nav, hero, features, CTA, footer as appropriate for the mission.
- Use a cohesive dark or light theme with clear typography hierarchy.
- Korean copy for headings and body where the mission is in Korean.
- Responsive (mobile-friendly media queries).
- Accessible: semantic tags, sufficient contrast, alt text on decorative sections if needed."""


def _build_design_prompt(mission: str, deliverable_contents: dict[str, str], prior_context: str) -> str:
    mockup = deliverable_contents.get("mockup", "")
    wireframe = deliverable_contents.get("wireframe", "")
    spec = deliverable_contents.get("design_spec", "")
    ctx = f"\n\nPrior work from pipeline:\n{prior_context[:2500]}" if prior_context else ""
    return (
        f"Mission: {mission}\n\n"
        f"Mockup notes:\n{mockup[:2000]}\n\n"
        f"Wireframe notes:\n{wireframe[:1500]}\n\n"
        f"Design spec:\n{spec[:1500]}"
        f"{ctx}\n\n"
        "Create one polished landing/product UI mockup as standalone HTML."
    )


def _build_handoff_markdown(mission: str, html_filename: str, deliverable_contents: dict[str, str]) -> str:
    spec = deliverable_contents.get("design_spec", deliverable_contents.get("mockup", ""))
    return (
        f"# Claude Design Handoff\n\n"
        f"## Mission\n{mission}\n\n"
        f"## Design file\n`{html_filename}` — open in browser or import to Claude Design for refinement.\n\n"
        f"## Layout summary\n{spec[:1500]}\n\n"
        f"## Dev handoff\n"
        f"- Implement components matching the HTML structure\n"
        f"- Preserve spacing, colors, and typography from the design file\n"
        f"- Reference Virtual Office brand: dark navy `#1a1a2e`, accent green `#7ba87b`\n"
    )


def _build_claude_design_prompt(mission: str, deliverable_contents: dict[str, str]) -> str:
    mockup = deliverable_contents.get("mockup", "")[:800]
    return (
        f"Create a polished UI design for: {mission}\n\n"
        f"Context from our AI office pipeline:\n{mockup}\n\n"
        f"Style: modern SaaS landing, dark theme optional, Korean UI copy."
    )


def _extract_html(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:html)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    start = text.lower().find("<!doctype")
    if start == -1:
        start = text.lower().find("<html")
    if start >= 0:
        text = text[start:]
    end = text.lower().rfind("</html>")
    if end >= 0:
        text = text[: end + 7]
    return text.strip()


async def export_claude_design(
    session_id: str,
    agent_id: str,
    mission: str,
    deliverable_contents: dict[str, str],
    prior_context: str = "",
) -> list[dict]:
    artifacts: list[dict] = []
    html_filename = f"{agent_id}_claude_design.html"
    handoff_filename = f"{agent_id}_claude_design_handoff.md"
    link_filename = f"{agent_id}_claude_design_link.json"

    prompt = _build_design_prompt(mission, deliverable_contents, prior_context)
    raw_html = await claude.collect_claude(DESIGN_HTML_SYSTEM, prompt, max_tokens=8000)
    html = _extract_html(raw_html)

    if len(html) < 200 or "<html" not in html.lower():
        from .task_workspace import ensure_session_dir

        fallback_path = ensure_session_dir(session_id) / html_filename
        export_ui_mockup_html(fallback_path, mission, deliverable_contents.get("mockup", mission))
        html = fallback_path.read_text(encoding="utf-8")

    write_text(session_id, html_filename, html)
    artifacts.append(
        artifact_meta(session_id, agent_id, html_filename, "claude-design", "Claude Design UI")
    )

    handoff = _build_handoff_markdown(mission, html_filename, deliverable_contents)
    write_text(session_id, handoff_filename, handoff)
    artifacts.append(
        artifact_meta(session_id, agent_id, handoff_filename, "markdown", "Design Handoff")
    )

    design_prompt = _build_claude_design_prompt(mission, deliverable_contents)
    link_payload: dict[str, Any] = {
        "status": "ready",
        "mission": mission,
        "claudeDesignUrl": CLAUDE_DESIGN_URL,
        "designPrompt": design_prompt,
        "htmlUrl": f"/api/workspace/{session_id}/{html_filename}",
        "handoffUrl": f"/api/workspace/{session_id}/{handoff_filename}",
        "instructions": [
            "산출물 탭에서 Claude Design UI 미리보기 확인",
            f"claude.ai/design 에서 동일 미션으로 고도화 (프롬프트 복사)",
            "Claude Design에서 Export → standalone HTML 후 workspace에 업로드 가능",
        ],
        "hasClaudeApi": bool(os.getenv("ANTHROPIC_API_KEY")),
    }
    write_text(session_id, link_filename, json.dumps(link_payload, ensure_ascii=False, indent=2))
    artifacts.append(
        artifact_meta(session_id, agent_id, link_filename, "claude-design", "Claude Design Link")
    )

    return artifacts
