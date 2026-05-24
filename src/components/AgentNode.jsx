import { motion, AnimatePresence } from 'framer-motion'
import { AGENT_STATUS, statusToPill } from '../data/agents'
import StatusPill from './StatusPill'

export default function AgentNode({
  agent,
  status,
  work,
  artifacts = [],
  selected = false,
  onSelect,
  onViewResult,
}) {
  const isMain = agent.isMain
  const size = agent.size ?? 'md'
  const isActive = status !== AGENT_STATUS.IDLE
  const showWorkPanel =
    !isMain && (work?.active || status === AGENT_STATUS.WORKING || status === AGENT_STATUS.REPORTING)
  const hasResults = artifacts.length > 0
  const pillStatus =
    status === AGENT_STATUS.REPORTING ? 'reporting' : statusToPill(status)

  return (
    <motion.button
      type="button"
      className={`agent-node agent-node--${size} ${selected ? 'agent-node--selected' : ''}`}
      style={{ gridArea: agent.gridArea, '--agent-accent': agent.accent, '--agent-accent-bg': agent.accentBg }}
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1, y: selected ? -2 : 0 }}
      transition={{ duration: 0.35 }}
    >
      <AnimatePresence>
        {showWorkPanel && work?.message && (
          <motion.div
            className="agent-node__work-tooltip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <span>{work.message}</span>
            {work.active && (
              <div className="agent-node__progress-track">
                <motion.div
                  className="agent-node__progress-bar"
                  animate={{ width: `${work.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            {work.active && <span className="agent-node__progress-label">{work.progress}%</span>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="agent-node__orb-wrap">
        {isMain && <div className="agent-node__orbit" />}
        <motion.div
          className="agent-node__orb"
          animate={status === AGENT_STATUS.WORKING ? { rotate: [0, 2, -2, 0] } : {}}
          transition={{ duration: 0.6, repeat: status === AGENT_STATUS.WORKING ? Infinity : 0 }}
        >
          {agent.emoji}
        </motion.div>
      </div>

      <div className="agent-node__card">
        <div className="agent-node__name">{agent.name}</div>
        <div className="agent-node__role">
          {agent.role} · <span>{agent.sub}</span>
        </div>
        <div className="agent-node__status">
          <StatusPill status={pillStatus} />
        </div>

        <AnimatePresence>
          {hasResults && (
            <motion.div
              className="agent-node__results"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {artifacts.map((artifact) => (
                <button
                  key={artifact.filename}
                  type="button"
                  className="agent-node__result-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewResult?.(artifact)
                  }}
                >
                  결과물 · {artifact.title ?? artifact.filename}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isActive && <motion.div className="agent-node__pulse" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />}
    </motion.button>
  )
}
