export const AGENT_STATUS = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  WORKING: 'WORKING',
  REPORTING: 'REPORTING',
}

export const CEO = {
  id: 'ceo',
  name: 'CEO',
  role: '최고 경영자',
  emoji: '👑',
  color: '#ffd700',
}

export const MAIN_AGENT = {
  id: 'main',
  name: 'Main Agent',
  role: '팀장',
  emoji: '🧠',
  color: '#00d4ff',
}

export const SUB_AGENTS = [
  {
    id: 'musicDev',
    name: 'Music Dev',
    role: '음악 개발',
    emoji: '🎹',
    color: '#7b61ff',
    position: { top: '8%', left: '50%', transform: 'translateX(-50%)' },
  },
  {
    id: 'score',
    name: 'Score Specialist',
    role: '악보',
    emoji: '🎼',
    color: '#00ffaa',
    position: { top: '50%', right: '4%', transform: 'translateY(-50%)' },
  },
  {
    id: 'marketer',
    name: 'SNS Marketer',
    role: '마케팅',
    emoji: '📱',
    color: '#ff6bcb',
    position: { bottom: '8%', left: '50%', transform: 'translateX(-50%)' },
  },
  {
    id: 'legal',
    name: 'Legal Auditor',
    role: '법무',
    emoji: '⚖️',
    color: '#ffb347',
    position: { top: '50%', left: '4%', transform: 'translateY(-50%)' },
  },
]

export const STATUS_LABELS = {
  [AGENT_STATUS.IDLE]: '대기',
  [AGENT_STATUS.THINKING]: '생각 중',
  [AGENT_STATUS.WORKING]: '작업 중',
  [AGENT_STATUS.REPORTING]: '보고 중',
}

export function getAgentById(id) {
  if (id === 'ceo') return CEO
  if (id === 'main') return MAIN_AGENT
  return SUB_AGENTS.find((a) => a.id === id)
}
