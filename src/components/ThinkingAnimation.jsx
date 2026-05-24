import { motion } from 'framer-motion'

export default function ThinkingAnimation({ small = false }) {
  return (
    <div className={`thinking-dots ${small ? 'thinking-dots--small' : ''}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="thinking-dots__dot"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}
