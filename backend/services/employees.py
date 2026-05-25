from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from .role_templates import ROLE_TEMPLATES, resolve_template_id

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EMPLOYEES_FILE = PROJECT_ROOT / "data" / "employees.json"

DEFAULT_EMPLOYEES: list[dict[str, Any]] = [
    {
        "id": "planner-1",
        "name": "Yuna",
        "role": "기획자",
        "roleTemplateId": "planner",
        "emoji": "📋",
        "deskId": "desk-meeting-1",
        "skills": ["prd", "spec", "user-story"],
        "active": True,
        "color": "#c4a035",
    },
    {
        "id": "developer-1",
        "name": "Alex",
        "role": "개발자",
        "roleTemplateId": "developer",
        "emoji": "💻",
        "deskId": "desk-dev-1",
        "skills": ["code", "api", "backend"],
        "active": True,
        "color": "#6b9bd1",
    },
    {
        "id": "designer-1",
        "name": "Luna",
        "role": "디자이너",
        "roleTemplateId": "designer",
        "emoji": "🎨",
        "deskId": "desk-dev-2",
        "skills": ["ui", "ux", "wireframe"],
        "active": True,
        "color": "#d47b9b",
    },
    {
        "id": "reviewer-1",
        "name": "Chris",
        "role": "리뷰어",
        "roleTemplateId": "reviewer",
        "emoji": "🔍",
        "deskId": "desk-meeting-2",
        "skills": ["review", "feedback"],
        "active": True,
        "color": "#9b7bd4",
    },
    {
        "id": "qa-1",
        "name": "Jay",
        "role": "QA",
        "roleTemplateId": "qa",
        "emoji": "✅",
        "deskId": "desk-analyst-1",
        "skills": ["test", "qa", "automation"],
        "active": True,
        "color": "#7bd4a8",
    },
]


def _ensure_data_dir() -> None:
    EMPLOYEES_FILE.parent.mkdir(parents=True, exist_ok=True)


def _normalize_employee(employee: dict[str, Any]) -> dict[str, Any]:
    template_id = resolve_template_id(employee)
    template = ROLE_TEMPLATES.get(template_id, {})
    normalized = {**employee, "roleTemplateId": template_id}
    if not normalized.get("role") or normalized["role"] == "AI Employee":
        normalized["role"] = template.get("label", normalized.get("role", "AI Employee"))
    if normalized.get("emoji") in (None, "🤖") and template.get("emoji"):
        normalized.setdefault("emoji", template["emoji"])
    if not normalized.get("color") and template.get("color"):
        normalized["color"] = template["color"]
    if not normalized.get("skills"):
        normalized["skills"] = template.get("skills", [])
    return normalized


def load_employees() -> list[dict[str, Any]]:
    _ensure_data_dir()
    if not EMPLOYEES_FILE.exists():
        save_employees(DEFAULT_EMPLOYEES)
        return [_normalize_employee(emp) for emp in DEFAULT_EMPLOYEES]
    data = json.loads(EMPLOYEES_FILE.read_text(encoding="utf-8"))
    employees = [_normalize_employee(emp) for emp in data.get("employees", [])]
    save_employees(employees)
    return employees


def save_employees(employees: list[dict[str, Any]]) -> None:
    _ensure_data_dir()
    EMPLOYEES_FILE.write_text(
        json.dumps({"employees": employees}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_active_employees() -> list[dict[str, Any]]:
    return [emp for emp in load_employees() if emp.get("active", True)]


def get_employee(employee_id: str) -> dict[str, Any] | None:
    for emp in load_employees():
        if emp["id"] == employee_id:
            return emp
    return None


def create_employee(payload: dict[str, Any]) -> dict[str, Any]:
    employees = load_employees()
    template_id = payload.get("roleTemplateId") or resolve_template_id(payload)
    template = ROLE_TEMPLATES.get(template_id, {})
    employee = _normalize_employee({
        "id": payload.get("id") or uuid.uuid4().hex[:8],
        "name": payload["name"].strip(),
        "role": payload.get("role") or template.get("label", "AI Employee"),
        "roleTemplateId": template_id,
        "emoji": payload.get("emoji") or template.get("emoji", "🤖"),
        "deskId": payload.get("deskId", ""),
        "skills": payload.get("skills") or template.get("skills", []),
        "active": payload.get("active", True),
        "color": payload.get("color") or template.get("color", "#6b9bd1"),
    })
    employees.append(employee)
    save_employees(employees)
    return employee


def update_employee(employee_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    employees = load_employees()
    for index, emp in enumerate(employees):
        if emp["id"] != employee_id:
            continue
        updated = _normalize_employee({**emp, **payload, "id": employee_id})
        employees[index] = updated
        save_employees(employees)
        return updated
    return None


def delete_employee(employee_id: str) -> bool:
    employees = load_employees()
    next_employees = [emp for emp in employees if emp["id"] != employee_id]
    if len(next_employees) == len(employees):
        return False
    save_employees(next_employees)
    return True
