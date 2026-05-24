import { motion } from 'framer-motion'

const CARD_TARGETS = {
  musicDev: { x: 0, y: -140 },
  score: { x: 180, y: 0 },
  marketer: { x: 0, y: 140 },
  legal: { x: -180, y: 0 },
}

export default function WorkCard({ card }) {
  const target = CARD_TARGETS[card.agentId] ?? { x: 0, y: 0 }

  return (
    <motion.div
      className="work-card"
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
      animate={{
        x: target.x,
        y: target.y,
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 0.8, 0.3],
      }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
    >
      <div className="work-card__inner">
        <span className="work-card__icon">📋</span>
        <span className="work-card__label">{card.label}</span>
      </div>
      <motion.div
        className="work-card__trail"
        animate={{ opacity: [0.8, 0] }}
        transition={{ duration: 1.1 }}
      />
    </motion.div>
  )
}
