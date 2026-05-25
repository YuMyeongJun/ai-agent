from __future__ import annotations

import asyncio
import os
from typing import AsyncIterator

from .role_templates import ROLE_TEMPLATES, get_template
from . import intent

MOCK_RESPONSES: dict[str, str] = {
    "main_greeting": "CEO님, 안녕하세요! 업무 지시를 내려주시면 팀에 배분하겠습니다.",
    "main_ack": "명령 확인했습니다, CEO님. 역할별 파이프라인으로 업무를 배분합니다.",
    "main_plan": "요청을 분석해 기획 → 개발 → 디자인 → 리뷰 → QA 순서로 배치하겠습니다.",
    "main_briefing": "CEO님, 모든 단계가 완료되었습니다. 아래 브리핑을 확인해 주세요.",
}

AGENT_PROMPTS: dict[str, str] = {
    "main": "You are Main Agent, the team lead orchestrator in a virtual AI office. Respond in Korean, concise (1-2 sentences).",
}


def _has_claude() -> bool:
    if os.getenv("CLAUDE_FORCE_MOCK", "").strip() in ("1", "true", "yes"):
        return False
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


_claude_api_live: bool | None = None
_claude_mock_reason: str | None = None


def claude_runtime_status() -> dict[str, str | bool | None]:
    return {
        "configured": bool(os.getenv("ANTHROPIC_API_KEY", "").strip()),
        "live": _claude_api_live if _claude_api_live is not None else _has_claude(),
        "mockReason": _claude_mock_reason,
        "forceMock": os.getenv("CLAUDE_FORCE_MOCK", "").strip() in ("1", "true", "yes"),
    }


def _mark_claude_unavailable(reason: str) -> None:
    global _claude_api_live, _claude_mock_reason
    _claude_api_live = False
    _claude_mock_reason = reason


def _mock_main_reply_text(mode: str, user_message: str) -> str:
    if mode == "chat":
        if intent._is_greeting(user_message):
            return "CEO님, 안녕하세요! 편하게 말씀해 주세요. 업무 지시가 필요하시면 말씀해 주시면 요약 후 확인 드릴게요."
        if "?" in user_message or "뭐" in user_message or "어떻" in user_message:
            return (
                "네, CEO님. 자유롭게 대화하시면 됩니다. "
                "업무를 시작하려면 원하시는 결과물을 말씀해 주세요. 예: '랜딩 페이지 기획해줘'"
            )
        return "네, CEO님. 말씀 잘 들었습니다. 업무로 진행하시려면 구체적인 요청을 내려주세요."
    if mode == "mission_proposal":
        prefix = ""
        if _claude_mock_reason:
            prefix = f"(Claude API 사용 불가: {_claude_mock_reason} — 로컬 응답)\n\n"
        return (
            f"{prefix}"
            f"요청을 이렇게 이해했습니다.\n"
            f"• 미션: {user_message}\n"
            f"• 예상 흐름: 기획 → 개발 → 디자인 → 리뷰 → QA\n"
            f"• 산출물: 역할별 PDF/PPT/코드/Claude Design HTML\n\n"
            f"이 요구사항이 맞을까요? 진행하려면 '네' 또는 '진행해줘'라고 답해 주세요."
        )
    return MOCK_RESPONSES.get("main_greeting", "CEO님, 말씀해 주세요.")


async def stream_text(text: str, chunk_size: int = 2, delay: float = 0.03) -> AsyncIterator[str]:
    for i in range(0, len(text), chunk_size):
        yield text[i : i + chunk_size]
        await asyncio.sleep(delay)


async def stream_main_reply(
    system: str,
    prompt: str,
    *,
    mode: str = "chat",
    user_message: str = "",
) -> AsyncIterator[str]:
    """Main Agent CEO chat — falls back to intent-aware mock if Claude API fails."""
    global _claude_api_live
    if _has_claude() and _claude_api_live is not False:
        parts: list[str] = []
        try:
            async for chunk in stream_claude(system, prompt, max_tokens=400):
                parts.append(chunk)
                yield chunk
            if "".join(parts).strip():
                _claude_api_live = True
                return
        except Exception as exc:
            reason = str(exc)
            if "credit balance" in reason.lower() or "billing" in reason.lower():
                _mark_claude_unavailable("Anthropic 크레딧 부족")
            else:
                _mark_claude_unavailable("Claude API 오류")

    text = _mock_main_reply_text(mode, user_message)
    async for chunk in stream_text(text):
        yield chunk


async def stream_claude(
    system: str,
    user: str,
    *,
    max_tokens: int = 400,
) -> AsyncIterator[str]:
    if not _has_claude():
        raise RuntimeError("Claude API not configured")

    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

    try:
        async with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception as exc:
        reason = str(exc)
        if "credit balance" in reason.lower():
            _mark_claude_unavailable("Anthropic 크레딧 부족")
        raise


async def collect_claude(system: str, user: str, *, max_tokens: int = 400) -> str:
    global _claude_api_live
    if not _has_claude() or _claude_api_live is False:
        return ""
    parts: list[str] = []
    try:
        async for chunk in stream_claude(system, user, max_tokens=max_tokens):
            parts.append(chunk)
        _claude_api_live = True
    except Exception:
        return ""
    return "".join(parts).strip()


def _mock_deliverable_content(
    template_id: str,
    spec: dict,
    mission: str,
    prior_context: str,
) -> str:
    title = spec.get("title", "Deliverable")
    suffix = spec.get("suffix", "")
    ctx = f"\n\n## 참고 (이전 단계)\n{prior_context[:1500]}" if prior_context else ""

    if template_id == "planner" and "presentation" in suffix:
        return (
            f"# {mission} — 기획 발표\n\n"
            "## 슬라이드 1: 문제 정의\n"
            "- 타깃 사용자의 핵심 pain point\n"
            "- 현재 대안의 한계\n\n"
            "## 슬라이드 2: 솔루션\n"
            f"- {mission} MVP 범위\n"
            "- 핵심 가치 제안 3가지\n\n"
            "## 슬라이드 3: 기능 우선순위\n"
            "- P0: Hero + CTA\n"
            "- P1: 기능 소개 · FAQ\n"
            "- P2: 분석 · SEO\n\n"
            "## 슬라이드 4: 일정 & KPI\n"
            "- 1주: 프로토타입\n"
            "- 2주: QA · 런치\n"
            "- KPI: CTA 3%, 이탈률 < 40%\n"
            f"{ctx}"
        )

    if template_id == "planner" and "prd" in suffix:
        return (
            f"# PRD — {mission}\n\n"
            "## 1. 목표\n"
            f"- CEO 요청「{mission}」을 달성하는 MVP 정의\n"
            "- 1주 내 프로토타입 가능한 범위로 스코프 제한\n\n"
            "## 2. 타깃 사용자\n"
            "- 신규 방문자: 서비스 가치를 10초 내 이해\n"
            "- 잠재 고객: CTA(문의/가입) 전환\n\n"
            "## 3. 핵심 기능\n"
            "| 우선순위 | 기능 | 설명 |\n"
            "|---|---|---|\n"
            "| P0 | 히어로 섹션 | 가치 제안 + CTA 버튼 |\n"
            "| P0 | 기능 소개 | 3~4개 카드 그리드 |\n"
            "| P1 | FAQ | 자주 묻는 질문 아코디언 |\n"
            "| P2 | 푸터 | 연락처·SNS 링크 |\n\n"
            "## 4. 성공 지표\n"
            "- CTA 클릭률 ≥ 3%\n"
            "- 모바일 LCP < 2.5s\n"
            f"{ctx}"
        )

    if template_id == "planner" and "user_stories" in suffix:
        return (
            f"# User Stories — {mission}\n\n"
            "## Epic: 랜딩 페이지 MVP\n\n"
            "### US-01 히어로\n"
            "- **As a** 방문자 **I want** 첫 화면에서 서비스 가치를 이해 **So that** CTA를 클릭할 수 있다\n"
            "- **AC**: 헤드라인·서브카피·CTA 1개, 모바일 375px 대응\n\n"
            "### US-02 기능 소개\n"
            "- **As a** 잠재 고객 **I want** 핵심 기능 3개를 비교 **So that** 도입 이유를 판단한다\n"
            "- **AC**: 아이콘+제목+설명 카드 3개\n\n"
            "### US-03 문의\n"
            "- **As a** 관심 고객 **I want** 이메일/문의 CTA **So that** 영업팀에 연결된다\n"
            f"{ctx}"
        )

    if template_id == "developer":
        if suffix.endswith(".py"):
            return (
                f'"""Implementation skeleton for: {mission}"""\n\n'
                "from dataclasses import dataclass\n\n\n"
                "@dataclass\n"
                "class LandingPageConfig:\n"
                '    headline: str = "Your product value proposition"\n'
                '    cta_label: str = "Get started"\n\n\n'
                "def build_page(config: LandingPageConfig) -> dict:\n"
                '    return {"sections": ["hero", "features", "cta", "footer"], "config": config}\n'
            )
        return (
            f"# API Notes — {mission}\n\n"
            "## Endpoints (draft)\n"
            "- `GET /` — landing static\n"
            "- `POST /api/contact` — lead capture\n\n"
            "## Stack suggestion\n"
            "- React + Vite frontend\n"
            "- FastAPI or serverless form handler\n"
            f"{ctx}"
        )

    if template_id == "designer":
        if "mockup" in suffix:
            return (
                f"# UI Mockup Brief — {mission}\n\n"
                "## Hero\n"
                "- Headline: 서비스 핵심 가치 한 문장\n"
                "- Subcopy: 타깃·혜택 2줄\n"
                "- Primary CTA: Get Started\n\n"
                "## Feature cards\n"
                "- Card 1: 빠른 시작\n"
                "- Card 2: 안전한 데이터\n"
                "- Card 3: 팀 협업\n\n"
                "## Visual tone\n"
                "- Dark navy background, green accent\n"
                "- Rounded cards, 12px grid\n"
                f"{ctx}"
            )
        if "wireframe" in suffix:
            return (
                f"# Wireframe — {mission}\n\n"
                "## Desktop layout\n"
                "- Header: logo left, nav right\n"
                "- Hero: 50/50 copy vs visual\n"
                "- Features: 3-column grid\n"
                "- Footer: contact + links\n"
                f"{ctx}"
            )
        return (
            f"# Design Spec — {mission}\n\n"
            "## Typography\n"
            "- Title: 32px semibold\n"
            "- Body: 16px regular\n\n"
            "## Colors\n"
            "- Primary #7ba87b, Background #1a1a2e\n\n"
            "## Components\n"
            "- Button primary / ghost\n"
            "- FeatureCard, SectionHeading\n"
            f"{ctx}"
        )

    if template_id == "reviewer":
        return (
            f"# Code Review — {mission}\n\n"
            "## Findings\n"
            "- [P1] PRD CTA 지표가 측정 가능한지 확인 필요\n"
            "- [P2] 모바일 터치 타깃 44px 권장\n\n"
            "## Recommendations\n"
            "- Hero CTA A/B 테스트 플랜 추가\n"
            "- 접근성(alt, contrast) 체크리스트 반영\n"
            f"{ctx}"
        )

    if template_id == "qa":
        if "test_cases" in suffix:
            return (
                f"# Test Cases — {mission}\n\n"
                "| ID | Scenario | Steps | Expected |\n"
                "|---|---|---|---|\n"
                "| TC-01 | Hero CTA | 랜딩 접속 → CTA 클릭 | 문의 폼 또는 #contact 이동 |\n"
                "| TC-02 | Mobile layout | 375px 뷰포트 | 카드 세로 스택, 가로 스크롤 없음 |\n"
                f"{ctx}"
            )
        return (
            f"# QA Report — {mission}\n\n"
            "## Summary\n"
            "- Critical: 0 / Major: 1 / Minor: 2\n\n"
            "## Sign-off\n"
            "- MVP 랜딩 기준 **조건부 통과** (모바일 QA 재검 필요)\n"
            f"{ctx}"
        )

    return (
        f"# {title}\n\n"
        f"## Mission\n{mission}\n\n"
        f"## Content\n{title} draft generated for this pipeline stage."
        f"{ctx}"
    )


async def generate_deliverable_content(
    template_id: str,
    spec: dict,
    mission: str,
    prior_context: str = "",
) -> str:
    template = get_template(template_id) or {}
    system = template.get(
        "systemPrompt",
        "You are a helpful AI assistant writing professional deliverables.",
    )
    user = (
        f"Mission: {mission}\n"
        f"Deliverable type: {spec.get('title', 'Document')} ({spec.get('suffix', '')})\n"
    )
    if prior_context:
        user += f"\nPrior deliverables from earlier stages:\n{prior_context[:3500]}\n"
    user += (
        f"\nWrite a complete, specific {spec.get('title', 'document')} in Korean. "
        "Use markdown headings and bullet lists. No preamble — start with the document title."
    )

    if not _has_claude() or _claude_api_live is False:
        return _mock_deliverable_content(template_id, spec, mission, prior_context)

    text = await collect_claude(system, user, max_tokens=2000)
    if len(text) < 80:
        return _mock_deliverable_content(template_id, spec, mission, prior_context)
    return text


async def generate_dialogue(
    from_name: str,
    to_name: str,
    from_role: str,
    to_role: str,
    situation: str,
) -> str:
    mock = (
        f"{from_name}({from_role}) → {to_name}({to_role}): "
        f"{situation[:80]}{'…' if len(situation) > 80 else ''}"
    )
    if not _has_claude():
        role_key = to_role if from_role in ("main", "team") else from_role
        template = get_template(role_key) or {}
        if "delegate" in situation.lower() or "Delegate" in situation:
            return template.get("mockDelegate") or f"{to_name}님, 업무를 전달드립니다."
        if "report" in situation.lower() or "Report" in situation or "보고" in situation:
            return template.get("mockReport") or f"{from_name}님, 단계 작업을 완료했습니다."
        if "standup" in situation.lower() or "standup" in situation:
            return f"팀원 여러분, CEO 미션 브리핑 시작하겠습니다. {situation[:80]}"
        return template.get("mockConfirm") or mock

    system = (
        "You simulate a short agent-to-agent message in a virtual office meeting room. "
        "Write ONE sentence in Korean. No markdown. Be natural and professional."
    )
    user = (
        f"From: {from_name} ({from_role})\n"
        f"To: {to_name} ({to_role})\n"
        f"Situation: {situation}\n"
        "Message:"
    )
    parts: list[str] = []
    try:
        async for chunk in stream_claude(system, user):
            parts.append(chunk)
    except Exception:
        role_key = to_role if from_role in ("main", "team") else from_role
        template = get_template(role_key) or {}
        if "delegate" in situation.lower() or "Delegate" in situation:
            return template.get("mockDelegate") or f"{to_name}님, 업무를 전달드립니다."
        if "report" in situation.lower() or "Report" in situation or "보고" in situation:
            return template.get("mockReport") or f"{from_name}님, 단계 작업을 완료했습니다."
        return template.get("mockConfirm") or mock
    text = "".join(parts).strip()
    return text or mock


async def stream_agent_message(
    agent_id: str,
    mock_key: str,
    user_prompt: str,
    role_template_id: str | None = None,
) -> AsyncIterator[str]:
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

    if mock_key == "main_plan":
        async for chunk in stream_text(MOCK_RESPONSES["main_plan"]):
            yield chunk
        return

    if mock_key == "main_ack":
        async for chunk in stream_text(MOCK_RESPONSES["main_ack"]):
            yield chunk
        return

    if mock_key == "main_briefing":
        async for chunk in stream_text(MOCK_RESPONSES["main_briefing"]):
            yield chunk
        return

    if mock_key.startswith("main_delegate_"):
        template_id = mock_key.replace("main_delegate_", "")
        template = get_template(template_id) or {}
        text = template.get("mockDelegate", f"@{template_id}에게 업무를 전달합니다.")
        async for chunk in stream_text(text):
            yield chunk
        return

    if mock_key.endswith("_report"):
        template_id = role_template_id or mock_key.replace("_report", "")
        template = get_template(template_id) or {}
        text = template.get("mockReport", "업무 완료 보고드립니다.")
        async for chunk in stream_text(text):
            yield chunk
        return

    template = get_template(role_template_id or agent_id) or {}
    if _has_claude() and template.get("systemPrompt"):
        async for chunk in stream_claude(template["systemPrompt"], user_prompt):
            yield chunk
        return

    text = template.get("mockConfirm", MOCK_RESPONSES.get(agent_id, "단계 작업을 진행하겠습니다."))
    async for chunk in stream_text(text):
        yield chunk
