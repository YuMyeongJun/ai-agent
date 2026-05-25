from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .figma_client import FigmaClient, FigmaClientError, figma_file_url, get_figma_config, is_figma_configured
from .task_workspace import artifact_meta, ensure_session_dir, write_text

FIGMA_PLUGIN_DOCS = "https://www.figma.com/community/plugin — Import: AI Virtual Office Importer (figma-plugin/)"


def build_figma_import_spec(
    mission: str,
    deliverable_contents: dict[str, str],
    session_id: str,
    agent_id: str,
) -> dict[str, Any]:
    mockup = deliverable_contents.get("mockup", "")
    wireframe = deliverable_contents.get("wireframe", "")
    design_spec = deliverable_contents.get("design_spec", mockup)

    return {
        "version": 1,
        "source": "ai-virtual-office",
        "sessionId": session_id,
        "agentId": agent_id,
        "mission": mission,
        "canvas": {"width": 1440, "height": 900, "name": f"Design — {mission[:40]}"},
        "frames": [
            {
                "name": "01 Header",
                "x": 80,
                "y": 40,
                "width": 1280,
                "height": 64,
                "fill": "#1A1A2E",
                "children": [
                    {"type": "text", "text": "Brand Logo", "x": 16, "y": 20, "fontSize": 14, "color": "#7BA87B"},
                    {"type": "text", "text": "Features · Pricing · Contact", "x": 900, "y": 22, "fontSize": 12, "color": "#9898B0"},
                ],
            },
            {
                "name": "02 Hero",
                "x": 80,
                "y": 120,
                "width": 620,
                "height": 280,
                "fill": "#FFFFFF",
                "children": [
                    {"type": "text", "text": mission[:60], "x": 24, "y": 40, "fontSize": 28, "color": "#1A1A2E"},
                    {"type": "text", "text": _first_line(mockup, 120), "x": 24, "y": 100, "fontSize": 14, "color": "#666680"},
                    {"type": "rect", "text": "Get Started", "x": 24, "y": 180, "width": 140, "height": 44, "fill": "#7BA87B", "radius": 8},
                ],
            },
            {
                "name": "03 Hero Visual",
                "x": 740,
                "y": 120,
                "width": 620,
                "height": 280,
                "fill": "#2D2D44",
                "children": [
                    {"type": "text", "text": "Hero Visual / Illustration", "x": 180, "y": 130, "fontSize": 16, "color": "#9898B0"},
                ],
            },
            {
                "name": "04 Features",
                "x": 80,
                "y": 430,
                "width": 400,
                "height": 160,
                "fill": "#FFFFFF",
                "children": [{"type": "text", "text": "Feature A", "x": 20, "y": 20, "fontSize": 16, "color": "#1A1A2E"}],
            },
            {
                "name": "05 Features B",
                "x": 520,
                "y": 430,
                "width": 400,
                "height": 160,
                "fill": "#FFFFFF",
                "children": [{"type": "text", "text": "Feature B", "x": 20, "y": 20, "fontSize": 16, "color": "#1A1A2E"}],
            },
            {
                "name": "06 Features C",
                "x": 960,
                "y": 430,
                "width": 400,
                "height": 160,
                "fill": "#FFFFFF",
                "children": [{"type": "text", "text": "Feature C", "x": 20, "y": 20, "fontSize": 16, "color": "#1A1A2E"}],
            },
            {
                "name": "07 Footer",
                "x": 80,
                "y": 620,
                "width": 1280,
                "height": 80,
                "fill": "#1A1A2E",
                "children": [
                    {"type": "text", "text": "Contact · SNS · © 2026", "x": 24, "y": 30, "fontSize": 12, "color": "#9898B0"},
                ],
            },
        ],
        "notes": {
            "mockup": mockup[:2000],
            "wireframe": wireframe[:2000],
            "designSpec": design_spec[:2000],
        },
    }


def _first_line(text: str, max_len: int = 100) -> str:
    for line in text.splitlines():
        cleaned = line.strip().lstrip("#-* ")
        if cleaned and not cleaned.startswith("Mission"):
            return cleaned[:max_len]
    return "Landing page value proposition and CTA."


def _format_comment(mission: str, session_id: str, agent_id: str, import_filename: str) -> str:
    return (
        f"🎨 AI Virtual Office — Designer deliverable\n"
        f"Mission: {mission}\n"
        f"Session: #{session_id}\n\n"
        f"1) Figma 플러그인 'AI Virtual Office Importer' 실행\n"
        f"2) Import JSON URL 또는 workspace/{session_id}/{import_filename} 붙여넣기\n"
        f"3) Generate Frames 클릭 → 와이어프레임/목업 프레임 자동 생성"
    )


async def sync_design_to_figma(
    session_id: str,
    agent_id: str,
    mission: str,
    deliverable_contents: dict[str, str],
) -> list[dict]:
    artifacts: list[dict] = []
    import_spec = build_figma_import_spec(mission, deliverable_contents, session_id, agent_id)
    import_filename = f"{agent_id}_figma_import.json"
    write_text(session_id, import_filename, json.dumps(import_spec, ensure_ascii=False, indent=2))
    artifacts.append(
        artifact_meta(session_id, agent_id, import_filename, "json", "Figma Import JSON")
    )

    import_url = f"/api/workspace/{session_id}/{import_filename}"
    link_payload: dict[str, Any] = {
        "status": "import_ready",
        "mission": mission,
        "importJsonUrl": import_url,
        "pluginPath": "figma-plugin/",
        "instructions": [
            "Figma → Plugins → Development → Import plugin from manifest (figma-plugin/manifest.json)",
            "플러그인 실행 → Import JSON URL에 위 URL 입력 → Generate Frames",
        ],
    }

    if not is_figma_configured():
        link_payload["status"] = "not_configured"
        link_payload["message"] = ".env에 FIGMA_ACCESS_TOKEN, FIGMA_FILE_KEY를 설정하면 Figma 파일에 자동 코멘트·프리뷰 export 됩니다."
        link_filename = f"{agent_id}_figma_link.json"
        write_text(session_id, link_filename, json.dumps(link_payload, ensure_ascii=False, indent=2))
        artifacts.append(artifact_meta(session_id, agent_id, link_filename, "figma", "Figma Design"))
        return artifacts

    token = os.getenv("FIGMA_ACCESS_TOKEN", "").strip()
    file_key = os.getenv("FIGMA_FILE_KEY", "").strip()
    client = FigmaClient(token)

    try:
        me = await client.get_me()
        file_meta = await client.get_file(file_key)
        file_name = file_meta.get("name", "Design File")

        comment_body = _format_comment(mission, session_id, agent_id, import_filename)
        comment = await client.post_comment(
            file_key,
            comment_body,
            client_meta={"x": 100, "y": 100},
        )

        link_payload.update({
            "status": "connected",
            "fileUrl": figma_file_url(file_key),
            "fileKey": file_key,
            "fileName": file_name,
            "commentId": comment.get("id"),
            "figmaUser": me.get("email") or me.get("handle"),
        })

        node_ids_raw = os.getenv("FIGMA_EXPORT_NODE_IDS", "").strip()
        if node_ids_raw:
            node_ids = [n.strip() for n in node_ids_raw.split(",") if n.strip()]
            images = await client.get_images(file_key, node_ids)
            for index, (node_id, image_url) in enumerate(images.items()):
                if not image_url:
                    continue
                png_bytes = await client.download_url(image_url)
                png_name = f"{agent_id}_figma_preview_{index + 1}.png"
                png_path = ensure_session_dir(session_id) / png_name
                png_path.write_bytes(png_bytes)
                artifacts.append(
                    artifact_meta(session_id, agent_id, png_name, "image", f"Figma Preview {index + 1}")
                )
                link_payload.setdefault("previewFiles", []).append(png_name)

    except FigmaClientError as exc:
        link_payload["status"] = "error"
        link_payload["message"] = str(exc)

    link_filename = f"{agent_id}_figma_link.json"
    write_text(session_id, link_filename, json.dumps(link_payload, ensure_ascii=False, indent=2))
    artifacts.append(artifact_meta(session_id, agent_id, link_filename, "figma", "Figma Design Link"))

    return artifacts
