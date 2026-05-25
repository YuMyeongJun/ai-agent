export const AGENT_STATUS = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  WORKING: 'WORKING',
  REPORTING: 'REPORTING',
} as const

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS]

export type RoleTemplateId = 'planner' | 'developer' | 'designer' | 'reviewer' | 'qa'

export interface IEmployee {
  id: string
  name: string
  role: string
  roleTemplateId: RoleTemplateId | string
  emoji: string
  deskId: string
  skills: string[]
  active: boolean
  color: string
}

export const MAIN_AGENT = {
  id: 'main',
  name: 'Main Agent',
  role: '팀장',
  emoji: '🧠',
  color: '#7ba87b',
}

export const STATUS_LABELS: Record<AgentStatus, string> = {
  [AGENT_STATUS.IDLE]: '대기',
  [AGENT_STATUS.THINKING]: '진행 중',
  [AGENT_STATUS.WORKING]: '업무 중',
  [AGENT_STATUS.REPORTING]: '보고 중',
}

export function statusToPill(status: AgentStatus): 'idle' | 'active' {
  return status === AGENT_STATUS.IDLE ? 'idle' : 'active'
}
