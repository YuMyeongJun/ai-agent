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
    "트랙",
    "곡",
    "음악",
    "블로그",
    "포스팅",
    "악보",
    "midi",
    "lo-fi",
    "lofi",
    "ambient",
    "shorts",
    "마케팅",
    "해줘",
    "해주",
    "부탁",
    "진행",
    "시작",
    "출력",
    "개발",
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


def _normalize(text: str) -> str:
    return re.sub(r"[\s!.?~…,]+", "", text.strip().lower())


def classify_command(command: str) -> str:
    """Return 'mission' or 'chat'."""
    text = command.strip()
    if not text:
        return "chat"

    normalized = _normalize(text)

    if any(hint in text.lower() for hint in MISSION_HINTS):
        return "mission"

    if normalized in {_normalize(p) for p in GREETING_PHRASES}:
        return "chat"

    if any(_normalize(p) in normalized for p in GREETING_PHRASES if len(_normalize(p)) >= 2):
        if len(normalized) <= 8:
            return "chat"

    if len(normalized) <= 4:
        return "chat"

    if len(text) >= 12:
        return "mission"

    return "chat"
