export * from './employeeType'

import { MAIN_AGENT } from './employeeType'

export function getAgentById(id: string): {
  name: string
  emoji: string
  accent: string
  accentBg: string
  role?: string
} {
  if (id === 'ceo') {
    return {
      name: 'CEO',
      emoji: '♛',
      accent: 'var(--terra)',
      accentBg: 'var(--terra-bg)',
      role: 'CEO',
    }
  }
  if (id === 'main') {
    return {
      name: MAIN_AGENT.name,
      emoji: MAIN_AGENT.emoji,
      accent: 'var(--sage)',
      accentBg: 'var(--sage-bg)',
      role: MAIN_AGENT.role,
    }
  }
  return {
    name: id,
    emoji: '🤖',
    accent: 'var(--sage)',
    accentBg: 'var(--sage-bg)',
    role: 'AI Employee',
  }
}
