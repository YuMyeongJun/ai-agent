from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import httpx

FIGMA_API_BASE = "https://api.figma.com/v1"


class FigmaClientError(Exception):
    pass


class FigmaClient:
    def __init__(self, access_token: str) -> None:
        self._token = access_token.strip()

    def _headers(self) -> dict[str, str]:
        return {"X-Figma-Token": self._token}

    async def get_me(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{FIGMA_API_BASE}/me", headers=self._headers())
        if response.status_code != 200:
            raise FigmaClientError(f"Figma auth failed ({response.status_code})")
        return response.json()

    async def get_file(self, file_key: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{FIGMA_API_BASE}/files/{file_key}",
                headers=self._headers(),
                params={"depth": 1},
            )
        if response.status_code != 200:
            raise FigmaClientError(f"Figma file fetch failed ({response.status_code})")
        return response.json()

    async def post_comment(
        self,
        file_key: str,
        message: str,
        *,
        client_meta: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"message": message}
        if client_meta:
            payload["client_meta"] = client_meta

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{FIGMA_API_BASE}/files/{file_key}/comments",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=payload,
            )
        if response.status_code not in (200, 201):
            raise FigmaClientError(f"Figma comment failed ({response.status_code}): {response.text[:200]}")
        return response.json()

    async def get_images(
        self,
        file_key: str,
        node_ids: list[str],
        *,
        scale: float = 2.0,
        fmt: str = "png",
    ) -> dict[str, str]:
        if not node_ids:
            return {}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{FIGMA_API_BASE}/images/{file_key}",
                headers=self._headers(),
                params={
                    "ids": ",".join(node_ids),
                    "format": fmt,
                    "scale": str(scale),
                },
            )
        if response.status_code != 200:
            raise FigmaClientError(f"Figma image export failed ({response.status_code})")
        data = response.json()
        if data.get("err"):
            raise FigmaClientError(str(data["err"]))
        return data.get("images") or {}

    async def download_url(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(url)
        if response.status_code != 200:
            raise FigmaClientError(f"Figma asset download failed ({response.status_code})")
        return response.content


def figma_file_url(file_key: str, node_id: str | None = None) -> str:
    url = f"https://www.figma.com/design/{file_key}"
    if node_id:
        url += f"?node-id={quote(node_id.replace(':', '-'))}"
    return url


def is_figma_configured() -> bool:
    return bool(os.getenv("FIGMA_ACCESS_TOKEN", "").strip() and os.getenv("FIGMA_FILE_KEY", "").strip())


def get_figma_config() -> dict[str, str | bool]:
    token = os.getenv("FIGMA_ACCESS_TOKEN", "").strip()
    file_key = os.getenv("FIGMA_FILE_KEY", "").strip()
    node_ids = os.getenv("FIGMA_EXPORT_NODE_IDS", "").strip()
    return {
        "configured": bool(token and file_key),
        "hasToken": bool(token),
        "hasFileKey": bool(file_key),
        "fileKey": file_key[:8] + "…" if len(file_key) > 8 else file_key,
        "exportNodeIds": node_ids,
    }
