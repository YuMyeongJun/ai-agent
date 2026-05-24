import { motion, AnimatePresence } from 'framer-motion'

export default function BriefingPanel({ results, visible, onDismiss }) {
  return (
    <AnimatePresence>
      {visible && results.length > 0 && (
        <motion.div
          className="briefing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="briefing-panel"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="briefing-panel__header">
              <motion.div
                className="briefing-panel__title-row"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="briefing-panel__icon">📊</span>
                <motion.div>
                  <h2 className="briefing-panel__title">Mission Briefing</h2>
                  <p className="briefing-panel__subtitle">Main Agent → CEO 결과물 보고</p>
                </motion.div>
              </motion.div>
              <motion.button
                type="button"
                className="briefing-panel__close"
                onClick={onDismiss}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="브리핑 닫기"
              >
                ✕
              </motion.button>
            </div>

            <motion.div
              className="briefing-panel__grid"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
              }}
            >
              {results.map((item) => (
                <motion.article
                  key={item.id}
                  className={`briefing-card briefing-card--${item.type}`}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(0, 212, 255, 0.15)' }}
                >
                  <motion.div className="briefing-card__head">
                    <span className="briefing-card__icon">{item.icon}</span>
                    <motion.div className="briefing-card__meta">
                      <h3 className="briefing-card__title">{item.title}</h3>
                      <span className="briefing-card__subtitle">{item.subtitle}</span>
                    </motion.div>
                    <span className={`briefing-card__tag briefing-card__tag--${item.tag}`}>
                      {item.tag.replace('-', ' ').toUpperCase()}
                    </span>
                  </motion.div>
                  <pre className="briefing-card__content">{item.content}</pre>
                </motion.article>
              ))}
            </motion.div>

            <motion.div
              className="briefing-panel__footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <span className="briefing-panel__from">🧠 Main Agent</span>
              <motion.button
                type="button"
                className="briefing-panel__confirm"
                onClick={onDismiss}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                확인 완료
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
