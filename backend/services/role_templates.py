from __future__ import annotations

from typing import Any

ROLE_TEMPLATES: dict[str, dict[str, Any]] = {
    "planner": {
        "id": "planner",
        "label": "기획자",
        "labelEn": "Planner",
        "emoji": "📋",
        "order": 1,
        "color": "#c4a035",
        "workMessage": "PRD · 기획서 PDF · 발표 PPT 작성 중...",
        "skills": ["prd", "spec", "user-story", "roadmap"],
        "deliverables": [
            {"suffix": "prd.pdf", "title": "기획서 PDF", "kind": "pdf", "generator": "prd"},
            {"suffix": "brief.pptx", "title": "기획 발표 PPT", "kind": "pptx", "generator": "presentation"},
            {"suffix": "user_stories.pdf", "title": "User Stories PDF", "kind": "pdf", "generator": "user_stories"},
        ],
        "systemPrompt": (
            "You are a Product Planner AI. Write concise PRD-style output in Korean. "
            "Focus on goals, user stories, acceptance criteria, and roadmap slides content."
        ),
        "mockConfirm": "PRD와 사용자 스토리 초안을 작성하겠습니다.",
        "mockReport": "PRD · User Stories 작성 완료.",
        "mockDelegate": "@기획자, CEO 요청을 PRD와 사용자 스토리로 정리해 주세요.",
    },
    "developer": {
        "id": "developer",
        "label": "개발자",
        "labelEn": "Developer",
        "emoji": "💻",
        "order": 2,
        "color": "#6b9bd1",
        "workMessage": "아키텍처 설계 · API · 코드 구현 중...",
        "skills": ["code", "api", "backend", "frontend"],
        "deliverables": [
            {"suffix": "implementation.py", "title": "Implementation", "kind": "code"},
            {"suffix": "api_notes.md", "title": "API Notes", "kind": "markdown"},
        ],
        "systemPrompt": (
            "You are a Developer AI. Use prior PRD/spec if provided. "
            "Respond in Korean about architecture, APIs, and implementation plan."
        ),
        "mockConfirm": "기획안을 바탕으로 API와 구현 계획을 진행합니다.",
        "mockReport": "코드 스켈레톤 · API 노트 작성 완료.",
        "mockDelegate": "@개발자, 기획안 기반으로 구현 계획과 코드를 작성해 주세요.",
        "needsPriorContext": True,
    },
    "designer": {
        "id": "designer",
        "label": "디자이너",
        "labelEn": "Designer",
        "emoji": "🎨",
        "order": 3,
        "color": "#d47b9b",
        "workMessage": "Claude Design UI · 와이어프레임 · 핸드오프 작성 중...",
        "skills": ["ui", "ux", "wireframe", "design-system"],
        "deliverables": [
            {"suffix": "wireframe.svg", "title": "Wireframe", "kind": "svg", "generator": "wireframe"},
            {"suffix": "design_spec.pdf", "title": "Design Spec PDF", "kind": "pdf", "generator": "design_spec"},
        ],
        "systemPrompt": (
            "You are a UI/UX Designer AI. Use prior PRD and dev notes if provided. "
            "Respond in Korean about layout, components, and user flows."
        ),
        "mockConfirm": "UI 스펙과 와이어프레임 노트를 작성합니다.",
        "mockReport": "UI Spec · Wireframe Notes 완료.",
        "mockDelegate": "@디자이너, PRD와 개발 범위에 맞는 UI 스펙을 작성해 주세요.",
        "needsPriorContext": True,
    },
    "reviewer": {
        "id": "reviewer",
        "label": "리뷰어",
        "labelEn": "Reviewer",
        "emoji": "🔍",
        "order": 4,
        "color": "#9b7bd4",
        "workMessage": "기획·개발·디자인 산출물 코드 리뷰 중...",
        "skills": ["review", "feedback", "quality"],
        "deliverables": [
            {"suffix": "code_review.pdf", "title": "Review Report PDF", "kind": "pdf", "generator": "review"},
        ],
        "systemPrompt": (
            "You are a Code/Product Reviewer AI. Review all prior deliverables critically. "
            "Respond in Korean with findings, risks, and improvement suggestions."
        ),
        "mockConfirm": "이전 단계 산출물을 검토하고 리뷰 리포트를 작성합니다.",
        "mockReport": "코드/기획 리뷰 리포트 작성 완료.",
        "mockDelegate": "@리뷰어, 앞 단계 산출물을 검토하고 피드백을 정리해 주세요.",
        "needsPriorContext": True,
    },
    "qa": {
        "id": "qa",
        "label": "QA",
        "labelEn": "QA Engineer",
        "emoji": "✅",
        "order": 5,
        "color": "#7bd4a8",
        "workMessage": "테스트 케이스 · QA 체크리스트 작성 중...",
        "skills": ["test", "qa", "automation", "bug-report"],
        "deliverables": [
            {"suffix": "test_cases.pdf", "title": "Test Cases PDF", "kind": "pdf", "generator": "test_cases"},
            {"suffix": "qa_report.pdf", "title": "QA Report PDF", "kind": "pdf", "generator": "qa_report"},
        ],
        "systemPrompt": (
            "You are a QA Engineer AI. Write test cases and QA report in Korean "
            "based on PRD, implementation, and review feedback."
        ),
        "mockConfirm": "테스트 케이스와 QA 리포트를 작성합니다.",
        "mockReport": "Test Cases · QA Report 작성 완료.",
        "mockDelegate": "@QA, 리뷰 반영 후 테스트 케이스와 QA 리포트를 작성해 주세요.",
        "needsPriorContext": True,
    },
}

PIPELINE_ORDER = ["planner", "developer", "designer", "reviewer", "qa"]

# Legacy employee id / role keyword → template
LEGACY_TEMPLATE_MAP = {
    "dev": "developer",
    "researcher": "planner",
    "writer": "planner",
    "analyst": "qa",
    "developer": "developer",
    "planner": "planner",
    "designer": "designer",
    "reviewer": "reviewer",
    "qa": "qa",
}


def list_templates() -> list[dict[str, Any]]:
    return sorted(ROLE_TEMPLATES.values(), key=lambda t: t["order"])


def get_template(template_id: str) -> dict[str, Any] | None:
    return ROLE_TEMPLATES.get(template_id)


def resolve_template_id(employee: dict[str, Any]) -> str:
    explicit = employee.get("roleTemplateId")
    if explicit and explicit in ROLE_TEMPLATES:
        return explicit

    emp_id = employee.get("id", "")
    if emp_id in LEGACY_TEMPLATE_MAP:
        return LEGACY_TEMPLATE_MAP[emp_id]

    role_lower = employee.get("role", "").lower()
    for keyword, template_id in [
        ("기획", "planner"),
        ("planner", "planner"),
        ("개발", "developer"),
        ("developer", "developer"),
        ("dev", "developer"),
        ("디자인", "designer"),
        ("designer", "designer"),
        ("ui", "designer"),
        ("리뷰", "reviewer"),
        ("reviewer", "reviewer"),
        ("qa", "qa"),
        ("테스트", "qa"),
        ("품질", "qa"),
    ]:
        if keyword in role_lower:
            return template_id

    return "developer"


def infer_templates_for_command(command: str) -> list[str]:
    text = command.lower()
    stages: list[str] = []

    if any(k in text for k in ("기획", "prd", "요구", "스펙", "plan", "spec")):
        stages.append("planner")
    if any(k in text for k in ("개발", "코드", "api", "implement", "dev", "백엔드", "프론트")):
        stages.append("developer")
    if any(k in text for k in ("디자인", "ui", "ux", "와이어", "design", "화면")):
        stages.append("designer")
    if any(k in text for k in ("리뷰", "검토", "review", "피드백", "feedback")):
        stages.append("reviewer")
    if any(k in text for k in ("qa", "테스트", "test", "버그", "bug", "품질")):
        stages.append("qa")

    if not stages:
        return list(PIPELINE_ORDER)

    ordered = [tid for tid in PIPELINE_ORDER if tid in stages]
    # Full product flow: dev/design implies UI + review + QA
    if "developer" in ordered and "designer" not in ordered:
        ordered.insert(ordered.index("developer") + 1, "designer")
    if "developer" in ordered or "designer" in ordered:
        for tid in ("reviewer", "qa"):
            if tid not in ordered:
                ordered.append(tid)
    return ordered
