import { motion, AnimatePresence } from 'framer-motion'
import { STATUS_LABELS } from '../data/agents'
import ThinkingAnimation from './ThinkingAnimation'

export default function SubAgent({ agent, status, work, artifacts = [], onViewResult }) {
  const isActive = status !== 'IDLE'
  const showWorkPanel = work?.active || status === 'WORKING' || status === 'REPORTING'
  const hasResults = artifacts.length > 0

  return (
    <motion.div
      className="sub-agent"
      style={agent.position}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.div
        className="sub-agent__glow"
        style={{ '--agent-color': agent.color }}
        animate={{
          opacity: isActive ? [0.3, 0.7, 0.3] : 0.15,
          scale: isActive ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
      />

      <AnimatePresence>
        {showWorkPanel && work?.message && (
          <motion.div
            className="sub-agent__work-tooltip"
            style={{ '--agent-color': agent.color }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <span className="sub-agent__work-message">{work.message}</span>
            {work.active && (
              <div className="sub-agent__progress-track">
                <motion.div
                  className="sub-agent__progress-bar"
                  style={{ '--agent-color': agent.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${work.progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            )}
            {work.active && (
              <span className="sub-agent__progress-label">{work.progress}%</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="sub-agent__avatar"
        style={{ '--agent-color': agent.color }}
        animate={status === 'WORKING' ? { rotate: [0, 3, -3, 0] } : {}}
        transition={{ duration: 0.6, repeat: status === 'WORKING' ? Infinity : 0 }}
      >
        <span className="sub-agent__emoji">{agent.emoji}</span>
      </motion.div>

      <motion.div
        className="sub-agent__status-window"
        style={{ '--agent-color': agent.color }}
        layout
      >
        <motion.div className="sub-agent__header">
          <span className="sub-agent__name">{agent.name}</span>
          <span className="sub-agent__role">{agent.role}</span>
        </motion.div>
        <div className="sub-agent__status-row">
          <span className={`status-badge status-badge--${status.toLowerCase()}`}>
            {STATUS_LABELS[status]}
          </span>
          {status === 'THINKING' && <ThinkingAnimation small />}
        </div>

        <AnimatePresence>
          {hasResults && (
            <motion.div
              className="sub-agent__results"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {artifacts.map((artifact) => (
                <motion.button
                  key={artifact.filename}
                  type="button"
                  className="sub-agent__result-btn"
                  style={{ '--agent-color': agent.color }}
                  onClick={() => onViewResult(artifact)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  결과물 보기 · {artifact.title ?? artifact.filename}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
