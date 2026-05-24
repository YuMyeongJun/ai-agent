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
  emoji: '♛',
  accent: 'var(--terra)',
  accentBg: 'var(--terra-bg)',
}

export const MAIN_AGENT = {
  id: 'main',
  name: 'Main Agent',
  role: '팀장',
  sub: 'Orchestrator',
  emoji: '🧠',
  accent: 'var(--sage)',
  accentBg: 'var(--sage-bg)',
  desc: '명령을 분해하고 적절한 에이전트에게 위임합니다.',
  gridArea: 'main',
  size: 'lg',
  isMain: true,
}

export const SUB_AGENTS = [
  {
    id: 'musicDev',
    name: 'Music Dev',
    role: '음악 개발',
    sub: 'Composer',
    emoji: '🎹',
    accent: 'var(--plum)',
    accentBg: 'var(--plum-bg)',
    desc: 'Python + music21 기반으로 트랙을 작곡합니다.',
    gridArea: 'music',
    lineColor: 'var(--plum)',
  },
  {
    id: 'score',
    name: 'Score Specialist',
    role: '악보 변환',
    sub: 'Engraver',
    emoji: '𝄞',
    accent: 'var(--moss)',
    accentBg: 'var(--moss-bg)',
    desc: 'MusicXML과 PDF 악보를 렌더링합니다.',
    gridArea: 'score',
    lineColor: 'var(--moss)',
  },
  {
    id: 'marketer',
    name: 'SNS Marketer',
    role: '마케팅',
    sub: 'Writer',
    emoji: '✏️',
    accent: 'var(--rose)',
    accentBg: 'var(--rose-bg)',
    desc: '블로그·SNS 콘텐츠 카피를 작성합니다.',
    gridArea: 'sns',
    lineColor: 'var(--rose)',
  },
  {
    id: 'legal',
    name: 'Legal Auditor',
    role: '법무 검토',
    sub: 'Auditor',
    emoji: '⚖️',
    accent: 'var(--sand)',
    accentBg: 'var(--sand-bg)',
    desc: '저작권 및 알고리즘 안전성을 검토합니다.',
    gridArea: 'legal',
    lineColor: 'var(--sand)',
  },
]

export const STATUS_LABELS = {
  [AGENT_STATUS.IDLE]: '대기',
  [AGENT_STATUS.THINKING]: '진행 중',
  [AGENT_STATUS.WORKING]: '진행 중',
  [AGENT_STATUS.REPORTING]: '보고 중',
}

export function statusToPill(status) {
  if (status === AGENT_STATUS.IDLE) return 'idle'
  if (status === AGENT_STATUS.REPORTING) return 'active'
  return 'active'
}

export function getAgentById(id) {
  if (id === 'ceo') return CEO
  if (id === 'main') return MAIN_AGENT
  return SUB_AGENTS.find((a) => a.id === id)
}

export const ALL_AGENTS = [MAIN_AGENT, ...SUB_AGENTS]
