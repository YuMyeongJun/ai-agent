import { useEffect, useState } from 'react'
import type { IEmployee } from '../../models/types/employeeType'
import { ROLE_TEMPLATES } from '../../models/types/roleTemplates'
import { getFreeDesks, OFFICE_DESKS } from '../../office/officeMap'
import { getRoleTemplate } from '../../models/types/roleTemplates'

export interface IEmployeePanelProps {
  employees: IEmployee[]
  selectedEmployeeId: string | null
  onSelect: (id: string | null) => void
  onCreate: (payload: Omit<IEmployee, 'id'>) => Promise<unknown>
  onUpdate: (id: string, payload: Partial<IEmployee>) => Promise<unknown>
  onRemove: (id: string) => Promise<void>
  selectedDeskId: string | null
}

export const EmployeePanel = ({
  employees,
  selectedEmployeeId,
  onSelect,
  onCreate,
  onUpdate,
  onRemove,
  selectedDeskId,
}: IEmployeePanelProps) => {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [roleTemplateId, setRoleTemplateId] = useState('developer')
  const [emoji, setEmoji] = useState('💻')
  const [saving, setSaving] = useState(false)

  const occupiedDesks = employees.map((emp) => emp.deskId).filter(Boolean)
  const freeDesks = getFreeDesks(occupiedDesks)
  const selected = employees.find((emp) => emp.id === selectedEmployeeId)

  useEffect(() => {
    const template = getRoleTemplate(roleTemplateId)
    if (template) setEmoji(template.emoji)
  }, [roleTemplateId])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const template = getRoleTemplate(roleTemplateId)
      const deskId = selectedDeskId && freeDesks.some((d) => d.id === selectedDeskId)
        ? selectedDeskId
        : freeDesks[0]?.id ?? ''
      await onCreate({
        name: name.trim(),
        role: template?.label ?? 'AI Employee',
        roleTemplateId,
        emoji: template?.emoji ?? emoji,
        deskId,
        skills: template?.skills ?? [],
        active: true,
        color: template?.color ?? '#6b9bd1',
      })
      setName('')
      setRoleTemplateId('developer')
      setEmoji('💻')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAssignDesk = async (deskId: string) => {
    if (!selected) return
    await onUpdate(selected.id, { deskId })
  }

  return (
    <div className="employee-panel">
      <div className="employee-panel__header">
        <span className="mono employee-panel__tag">staff</span>
        <span>AI 직원 ({employees.length})</span>
        <button type="button" className="employee-panel__add" onClick={() => setShowForm((v) => !v)}>
          + 고용
        </button>
      </div>

      <div className="employee-panel__pipeline-hint">
        파이프라인: {ROLE_TEMPLATES.map((t) => t.emoji).join(' → ')}
      </div>

      {showForm && (
        <div className="employee-panel__form">
          <input
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            value={roleTemplateId}
            onChange={(e) => setRoleTemplateId(e.target.value)}
          >
            {ROLE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.emoji} {template.label} ({template.labelEn})
              </option>
            ))}
          </select>
          <button type="button" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? '생성 중…' : '직원 추가'}
          </button>
        </div>
      )}

      <ul className="employee-panel__list">
        {employees.map((emp) => {
          const template = getRoleTemplate(emp.roleTemplateId)
          return (
            <li key={emp.id}>
              <button
                type="button"
                className={`employee-panel__item ${selectedEmployeeId === emp.id ? 'employee-panel__item--active' : ''}`}
                onClick={() => onSelect(emp.id)}
              >
                <span className="employee-panel__emoji">{emp.emoji}</span>
                <span className="employee-panel__info">
                  <strong>{emp.name}</strong>
                  <small>{template?.label ?? emp.role}</small>
                </span>
                <span className={`employee-panel__badge ${emp.active ? '' : 'employee-panel__badge--off'}`}>
                  {emp.active ? 'ON' : 'OFF'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selected && (
        <div className="employee-panel__detail">
          <h4>{selected.emoji} {selected.name}</h4>
          <p>{getRoleTemplate(selected.roleTemplateId)?.label ?? selected.role}</p>
          <p className="mono employee-panel__desk">
            책상: {OFFICE_DESKS.find((d) => d.id === selected.deskId)?.label ?? '미배치'}
          </p>
          <div className="employee-panel__actions">
            <button
              type="button"
              onClick={() => onUpdate(selected.id, { active: !selected.active })}
            >
              {selected.active ? '비활성화' : '활성화'}
            </button>
            <button
              type="button"
              className="employee-panel__danger"
              onClick={() => onRemove(selected.id).then(() => onSelect(null))}
            >
              해고
            </button>
          </div>
          {selectedDeskId && selectedDeskId !== selected.deskId && (
            <button type="button" className="employee-panel__assign" onClick={() => handleAssignDesk(selectedDeskId)}>
              선택한 책상에 배치
            </button>
          )}
        </div>
      )}
    </div>
  )
}
