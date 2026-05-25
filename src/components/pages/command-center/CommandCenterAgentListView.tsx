import { AGENT_STATUS, MAIN_AGENT, statusToPill } from '../../../models/types/agentType'
import type { AgentStatus } from '../../../models/types/agentType'
import type { IEmployee } from '../../../models/types/employeeType'
import type { IAgentWork } from '../../../hooks/useMissionStream'
import { CommandCenterStatusPill } from './CommandCenterStatusPill'

export interface ICommandCenterAgentListViewProps {
  employees?: IEmployee[]
  agentStatuses: Record<string, AgentStatus>
  agentWork: Record<string, IAgentWork>
  selectedAgentId: string
  onSelect: (agentId: string) => void
}

export const CommandCenterAgentListView = ({
  employees = [],
  agentStatuses,
  agentWork,
  selectedAgentId,
  onSelect,
}: ICommandCenterAgentListViewProps) => {
  const ALL = [
    { ...MAIN_AGENT, accent: 'var(--sage)', accentBg: 'var(--sage-bg)', sub: 'Orchestrator' },
    ...employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      emoji: e.emoji,
      accent: e.color,
      accentBg: `${e.color}22`,
      sub: e.deskId || 'desk',
    })),
  ]

  return (
    <div className="agent-list">
      {ALL.map((agent) => {
        const status = agentStatuses[agent.id]
        const work = agentWork[agent.id]
        const pillStatus =
          status === AGENT_STATUS.REPORTING ? 'reporting' : statusToPill(status ?? AGENT_STATUS.IDLE)

        return (
          <button
            key={agent.id}
            type="button"
            className={`agent-list__row ${selectedAgentId === agent.id ? 'agent-list__row--selected' : ''}`}
            style={
              {
                '--agent-accent': agent.accent,
                '--agent-accent-bg': agent.accentBg,
              } as React.CSSProperties
            }
            onClick={() => onSelect(agent.id)}
          >
            <span className="agent-list__icon">{agent.emoji}</span>
            <div className="agent-list__meta">
              <div className="agent-list__name">{agent.name}</div>
              <div className="agent-list__role">
                {agent.role} · {agent.sub}
              </div>
              {work?.message && <div className="agent-list__work">{work.message}</div>}
            </div>
            <CommandCenterStatusPill status={pillStatus} />
          </button>
        )
      })}
    </div>
  )
}
