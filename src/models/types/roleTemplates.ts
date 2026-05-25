export interface IRoleTemplate {
  id: string
  label: string
  labelEn: string
  emoji: string
  order: number
  color: string
  workMessage: string
  skills: string[]
}

export const ROLE_TEMPLATES: IRoleTemplate[] = [
  { id: 'planner', label: '기획자', labelEn: 'Planner', emoji: '📋', order: 1, color: '#c4a035', workMessage: 'PRD 작성', skills: ['prd', 'spec'] },
  { id: 'developer', label: '개발자', labelEn: 'Developer', emoji: '💻', order: 2, color: '#6b9bd1', workMessage: '코드 구현', skills: ['code', 'api'] },
  { id: 'designer', label: '디자이너', labelEn: 'Designer', emoji: '🎨', order: 3, color: '#d47b9b', workMessage: 'UI 설계', skills: ['ui', 'ux'] },
  { id: 'reviewer', label: '리뷰어', labelEn: 'Reviewer', emoji: '🔍', order: 4, color: '#9b7bd4', workMessage: '코드 리뷰', skills: ['review'] },
  { id: 'qa', label: 'QA', labelEn: 'QA Engineer', emoji: '✅', order: 5, color: '#7bd4a8', workMessage: '테스트', skills: ['test', 'qa'] },
]

export function getRoleTemplate(id: string): IRoleTemplate | undefined {
  return ROLE_TEMPLATES.find((t) => t.id === id)
}

export interface IPipelineStage {
  employeeId: string
  employeeName: string
  roleTemplateId: string
  roleLabel: string
  order: number
}
