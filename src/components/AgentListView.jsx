import { AGENT_STATUS, MAIN_AGENT, SUB_AGENTS, statusToPill } from '../data/agents'
import StatusPill from './StatusPill'

const ALL = [MAIN_AGENT, ...SUB_AGENTS]

export default function AgentListView({ agentStatuses, agentWork, selectedAgentId, onSelect }) {
  return (
    <div className="agent-list">
      {ALL.map((agent) => {
        const status = agentStatuses[agent.id]
        const work = agentWork[agent.id]
        const pillStatus =
          status === AGENT_STATUS.REPORTING ? 'reporting' : statusToPill(status)

        return (
          <button
            key={agent.id}
            type="button"
            className={`agent-list__row ${selectedAgentId === agent.id ? 'agent-list__row--selected' : ''}`}
            style={{ '--agent-accent': agent.accent, '--agent-accent-bg': agent.accentBg }}
            onClick={() => onSelect(agent.id)}
          >
            <span className="agent-list__icon">{agent.emoji}</span>
            <div className="agent-list__meta">
              <div className="agent-list__name">{agent.name}</div>
              <div className="agent-list__role">
                {agent.role} · {agent.sub}
              </div>
              {work?.message && (
                <div className="agent-list__work">{work.message}</div>
              )}
            </div>
            <StatusPill status={pillStatus} />
          </button>
        )
      })}
    </div>
  )
}
