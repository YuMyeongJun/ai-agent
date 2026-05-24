from __future__ import annotations

import asyncio
import os
from typing import AsyncIterator

MOCK_RESPONSES: dict[str, str] = {
    "main_greeting": "CEO님, 안녕하세요! 업무 지시를 내려주시면 팀에 배분하겠습니다.",
    "main_ack": "명령 확인했습니다, CEO님. 업무를 배분합니다.",
    "main_delegate_music": "@Music Dev, 마르코프 체인 기반 Lo-fi 트랙 코드를 작성해주세요.",
    "musicDev": "알겠습니다! Python + music21 파이프라인 가동합니다.",
    "main_delegate_score": "@Score, Music Dev 결과물을 악보로 변환해줘.",
    "score": "MusicXML + PDF 렌더링 시작합니다.",
    "main_delegate_marketer": "@Marketer, 네이버 블로그용 포스팅 초안 작성해.",
    "marketer": "Hook + 알고리즘 설명 + CTA 구조로 진행할게요!",
    "main_delegate_legal": "@Legal, 알고리즘 생성물 저작권 안전성 검토 부탁.",
    "legal": "마르코프/유클리드 알고리즘 — 카피라이트 이슈 없음 확인.",
    "musicDev_report": "C Major Lo-fi 트랙 MIDI 생성 완료. seed=42",
    "score_report": "MusicXML + PDF 악보 출력 완료.",
    "marketer_report": "블로그 포스팅 초안 & Shorts 스크립트 완료.",
    "legal_report": "저작권 안전성 PASS — 배포 가능.",
    "main_briefing": "CEO님, 모든 업무가 완료되었습니다. 아래 브리핑을 확인해 주세요.",
}

AGENT_PROMPTS: dict[str, str] = {
    "main": "You are Main Agent, the team lead orchestrator. Respond in Korean, concise (1-2 sentences).",
    "musicDev": "You are Music Dev, a Python music21 composer. Respond in Korean, concise.",
    "score": "You are Score Specialist. Respond in Korean about MusicXML/PDF conversion, concise.",
    "marketer": "You are SNS Marketer. Respond in Korean about blog/Shorts content, concise.",
    "legal": "You are Legal Auditor. Respond in Korean about copyright safety, concise.",
}


def _has_claude() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


async def stream_text(text: str, chunk_size: int = 2, delay: float = 0.03) -> AsyncIterator[str]:
    for i in range(0, len(text), chunk_size):
        yield text[i : i + chunk_size]
        await asyncio.sleep(delay)


async def stream_claude(system: str, user: str) -> AsyncIterator[str]:
    if not _has_claude():
        fallback = user.split("\n")[-1][:120]
        async for chunk in stream_text(fallback or "작업을 진행합니다."):
            yield chunk
        return

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

        async with client.messages.stream(
            model=model,
            max_tokens=300,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception:
        async for chunk in stream_text("작업을 진행합니다."):
            yield chunk


async def stream_agent_message(agent_id: str, mock_key: str, user_prompt: str) -> AsyncIterator[str]:
    if mock_key == "main_greeting":
        if _has_claude():
            system = (
                "You are Main Agent, the team lead. The CEO sent a casual greeting or small talk. "
                "Reply warmly in Korean in one short sentence. Do NOT assign tasks or start work."
            )
            async for chunk in stream_claude(system, user_prompt):
                yield chunk
        else:
            async for chunk in stream_text(MOCK_RESPONSES["main_greeting"]):
                yield chunk
        return

    if _has_claude():
        system = AGENT_PROMPTS.get(agent_id, "Respond in Korean, concise.")
        async for chunk in stream_claude(system, user_prompt):
            yield chunk
    else:
        async for chunk in stream_text(MOCK_RESPONSES[mock_key]):
            yield chunk
