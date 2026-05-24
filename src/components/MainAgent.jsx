import { motion } from 'framer-motion'
import { AGENT_STATUS, STATUS_LABELS } from '../data/agents'
import ThinkingAnimation from './ThinkingAnimation'

export default function MainAgent({ status }) {
  const isThinking = status === AGENT_STATUS.THINKING

  return (
    <motion.div
      className="main-agent"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.div
        className="main-agent__glow"
        animate={{
          scale: isThinking ? [1, 1.15, 1] : 1,
          opacity: isThinking ? [0.4, 0.8, 0.4] : 0.35,
        }}
        transition={{ duration: 1.5, repeat: isThinking ? Infinity : 0 }}
      />

      <motion.div
        className="main-agent__avatar"
        animate={isThinking ? { y: [0, -4, 0] } : { y: 0 }}
        transition={{ duration: 1.2, repeat: isThinking ? Infinity : 0 }}
      >
        <span className="main-agent__emoji">🧠</span>
      </motion.div>

      <motion.div
        className="main-agent__ring"
        animate={{ rotate: isThinking ? 360 : 0 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="main-agent__info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="main-agent__name">Main Agent</h2>
        <span className="main-agent__role">팀장 · Orchestrator</span>
      </motion.div>

      <div className="main-agent__status-panel">
        <span className={`status-badge status-badge--${status.toLowerCase()}`}>
          {STATUS_LABELS[status]}
        </span>
        {isThinking && <ThinkingAnimation />}
      </div>
    </motion.div>
  )
}
