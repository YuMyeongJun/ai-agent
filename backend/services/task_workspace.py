from __future__ import annotations

import json
from pathlib import Path

from .deliverable_export import (
    export_markdown_pdf,
    export_presentation_pptx,
    export_ui_mockup_html,
    export_wireframe_svg,
)
from .role_templates import ROLE_TEMPLATES, get_template

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = PROJECT_ROOT / "workspace"


def ensure_session_dir(session_id: str) -> Path:
    session_dir = WORKSPACE_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def write_text(session_id: str, filename: str, content: str) -> Path:
    path = ensure_session_dir(session_id) / filename
    path.write_text(content, encoding="utf-8")
    return path


def artifact_url(session_id: str, filename: str) -> str:
    return f"/api/workspace/{session_id}/{filename}"


def artifact_meta(session_id: str, agent_id: str, filename: str, kind: str, title: str) -> dict:
    return {
        "agentId": agent_id,
        "filename": filename,
        "path": str(ensure_session_dir(session_id) / filename),
        "kind": kind,
        "title": title,
        "url": artifact_url(session_id, filename),
    }


def save_task_meta(
    session_id: str,
    mission: str,
    employee_ids: list[str],
    pipeline: list[str],
) -> Path:
    payload = {
        "mission": mission,
        "employees": employee_ids,
        "pipeline": pipeline,
        "status": "completed",
    }
    return write_text(session_id, "task.json", json.dumps(payload, ensure_ascii=False, indent=2))


def _default_body(template: dict, mission: str, prior_context: str, ai_text: str | None) -> str:
    if ai_text:
        return ai_text
    label = template["label"]
    ctx_block = f"\n\n## 이전 단계 산출물\n{prior_context[:4000]}" if prior_context else ""
    return f"# {template['labelEn']} Output\n\n## Mission\n{mission}{ctx_block}\n\n## Summary\n{label} deliverable for this mission."


def _default_code(mission: str, prior_context: str) -> str:
    return f'"""Mission: {mission}"""\n\n# Generated skeleton\n# Prior context length: {len(prior_context)}\n\n'


def _write_deliverable_file(
    session_id: str,
    filename: str,
    kind: str,
    title: str,
    mission: str,
    text_content: str,
) -> Path:
    path = ensure_session_dir(session_id) / filename

    if kind == "pdf":
        export_markdown_pdf(path, title, text_content or mission)
    elif kind == "pptx":
        export_presentation_pptx(path, title, text_content or mission)
    elif kind == "html":
        export_ui_mockup_html(path, mission, text_content or mission)
    elif kind == "svg":
        export_wireframe_svg(path, mission, text_content or mission)
    else:
        path.write_text(text_content, encoding="utf-8")

    return path


def create_deliverable(
    session_id: str,
    agent_id: str,
    mission: str,
    template_id: str,
    ai_text: str | None = None,
    prior_context: str = "",
    deliverable_contents: dict[str, str] | None = None,
) -> list[dict]:
    template = get_template(template_id)
    if not template:
        write_text(session_id, f"{agent_id}_report.md", ai_text or f"Mission: {mission}")
        return [artifact_meta(session_id, agent_id, f"{agent_id}_report.md", "markdown", "Task Report")]

    artifacts: list[dict] = []
    body = _default_body(template, mission, prior_context, ai_text)

    for spec in template["deliverables"]:
        filename = f"{agent_id}_{spec['suffix']}"
        kind = spec["kind"]
        suffix = spec["suffix"]
        generator = spec.get("generator", suffix)
        title = spec["title"]

        if deliverable_contents:
            text_content = (
                deliverable_contents.get(generator)
                or deliverable_contents.get(suffix)
                or body
            )
        elif kind == "code":
            text_content = _default_code(mission, prior_context) if not ai_text else f"{ai_text}\n"
        else:
            text_content = body if spec == template["deliverables"][0] else (
                f"# {title}\n\nMission: {mission}\n\n"
                + (f"Based on prior work:\n{prior_context[:2000]}\n\n" if prior_context else "")
                + f"Detailed {title} content."
            )

        if kind in ("pdf", "pptx", "html", "svg"):
            _write_deliverable_file(session_id, filename, kind, title, mission, text_content)
        else:
            write_text(session_id, filename, text_content)

        artifacts.append(
            artifact_meta(session_id, agent_id, filename, kind, title)
        )

    return artifacts


def list_artifacts(session_id: str) -> list[dict]:
    session_dir = ensure_session_dir(session_id)
    artifacts: list[dict] = []
    kind_map = {
        ".md": "markdown",
        ".py": "code",
        ".json": "json",
        ".txt": "text",
        ".pdf": "pdf",
        ".pptx": "pptx",
        ".html": "html",
        ".htm": "html",
        ".svg": "svg",
        ".png": "image",
        ".jpg": "image",
        ".jpeg": "image",
    }

    for path in sorted(session_dir.iterdir(), key=lambda p: p.name):
        if not path.is_file() or path.name == "task.json":
            continue
        suffix = path.suffix.lower()
        if path.name.endswith("_figma_link.json"):
            kind = "figma"
        elif path.name.endswith("_claude_design_link.json"):
            kind = "claude-design"
        elif path.name.endswith("_claude_design.html"):
            kind = "claude-design"
        else:
            kind = kind_map.get(suffix, "file")
        title = path.stem.replace("_", " ").title()
        agent_id = path.name.split("_", 1)[0] if "_" in path.name else ""
        entry: dict = {
            "filename": path.name,
            "title": title,
            "kind": kind,
            "url": artifact_url(session_id, path.name),
            "agentId": agent_id,
            "size": path.stat().st_size,
        }
        if kind in ("markdown", "code", "text", "json", "html", "svg") and path.stat().st_size <= 120_000:
            try:
                entry["contentPreview"] = path.read_text(encoding="utf-8")
            except OSError:
                pass
        artifacts.append(entry)

    return artifacts


def read_artifact_context(session_id: str, artifacts: list[dict], max_chars: int = 2500) -> str:
    parts: list[str] = []
    total = 0
    for artifact in artifacts:
        path = ensure_session_dir(session_id) / artifact["filename"]
        if not path.exists():
            continue
        kind = artifact.get("kind", "")
        if kind in ("pdf", "pptx"):
            parts.append(f"### {artifact.get('title', artifact['filename'])}\n(binary {kind} file)")
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            parts.append(f"### {artifact.get('title', artifact['filename'])}\n(binary file)")
            continue
        chunk = f"### {artifact.get('title', artifact['filename'])}\n{content}"
        if total + len(chunk) > max_chars:
            chunk = chunk[: max_chars - total]
        parts.append(chunk)
        total += len(chunk)
        if total >= max_chars:
            break
    return "\n\n".join(parts)
