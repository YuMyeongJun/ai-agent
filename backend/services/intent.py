from __future__ import annotations

import re

MISSION_HINTS = (
    "만들",
    "생성",
    "작성",
    "기획",
    "변환",
    "검토",
    "코드",
    "분석",
    "리서치",
    "조사",
    "보고서",
    "블로그",
    "포스팅",
    "문서",
    "개발",
    "설계",
    "구현",
    "디자인",
    "와이어",
    "랜딩",
    "페이지",
    "프로젝트",
    "해줘",
    "해주",
    "부탁",
    "출력",
    "업무",
    "배포",
    "마케팅",
)

GREETING_PHRASES = (
    "안녕",
    "안녕하세요",
    "하이",
    "헬로",
    "hello",
    "hi",
    "hey",
    "ㅎㅇ",
    "반가워",
    "반갑",
    "좋은아침",
    "좋은오후",
    "좋은저녁",
    "고마워",
    "감사",
    "thanks",
    "thankyou",
    "뭐해",
    "어때",
    "잘지내",
)

CONFIRM_YES = (
    "네",
    "예",
    "응",
    "ㅇㅇ",
    "ok",
    "okay",
    "yes",
    "y",
    "맞아",
    "맞습니다",
    "맞어",
    "그래",
    "좋아",
    "진행",
    "진행해",
    "진행해줘",
    "시작",
    "시작해",
    "시작해줘",
    "부탁해",
    "go",
    "확인",
)

CONFIRM_NO = (
    "아니",
    "아니요",
    "아뇨",
    "노",
    "no",
    "n",
    "취소",
    "그만",
    "안해",
    "하지마",
    "보류",
    "잠깐",
    "수정",
)


def _normalize(text: str) -> str:
    return re.sub(r"[\s!.?~…,]+", "", text.strip().lower())


def _is_greeting(text: str) -> bool:
    normalized = _normalize(text)
    if normalized in {_normalize(p) for p in GREETING_PHRASES}:
        return True
    return any(_normalize(p) in normalized for p in GREETING_PHRASES if len(_normalize(p)) >= 2) and len(normalized) <= 10


def _is_confirm_yes(text: str) -> bool:
    normalized = _normalize(text)
    return normalized in {_normalize(p) for p in CONFIRM_YES}


def _is_confirm_no(text: str) -> bool:
    normalized = _normalize(text)
    if normalized in {_normalize(p) for p in CONFIRM_NO}:
        return True
    return any(normalized.startswith(_normalize(p)) for p in CONFIRM_NO if len(_normalize(p)) >= 2)


def classify_command(command: str) -> str:
    """Return 'mission' or 'chat'."""
    text = command.strip()
    if not text:
        return "chat"

    if _is_greeting(text):
        return "chat"

    lowered = text.lower()
    if any(hint in lowered for hint in MISSION_HINTS):
        return "mission"

    normalized = _normalize(text)
    if len(normalized) <= 6:
        return "chat"

    if len(text) >= 14:
        return "mission"

    return "chat"


def classify_interaction(command: str, has_pending_mission: bool = False) -> str:
    """
    Returns:
      - chat: casual conversation / greeting
      - mission_proposal: work request needing CEO confirmation
      - confirm_yes / confirm_no: answer to pending confirmation
    """
    text = command.strip()
    if not text:
        return "chat"

    if has_pending_mission:
        if _is_confirm_yes(text):
            return "confirm_yes"
        if _is_confirm_no(text):
            return "confirm_no"

    if classify_command(text) == "mission":
        return "mission_proposal"

    return "chat"
