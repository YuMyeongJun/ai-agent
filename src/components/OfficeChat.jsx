import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAgentById } from '../data/agents'

export default function OfficeChat({ messages }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="office-chat">
      <motion.div
        className="office-chat__header"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <span className="office-chat__icon">📡</span>
        <h3>Command Log</h3>
        <span className="office-chat__live">LIVE</span>
      </motion.div>

      <motion.div className="office-chat__messages" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.p
              key="empty"
              className="office-chat__empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
            >
              CEO 명령을 내리면 실시간 통신 로그가 표시됩니다.
            </motion.p>
          )}
          {messages.map((msg) => {
            const speaker = getAgentById(msg.speaker) ?? {
              name: msg.speaker,
              emoji: '🤖',
              color: '#00d4ff',
            }
            const isCeo = msg.speaker === 'ceo'
            const isMain = msg.speaker === 'main'

            return (
              <motion.div
                key={msg.id}
                className={`office-chat__message ${
                  isCeo ? 'office-chat__message--ceo' : isMain ? 'office-chat__message--main' : ''
                }`}
                initial={{ opacity: 0, x: isCeo ? 20 : isMain ? -20 : 0, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ '--speaker-color': speaker.color }}
              >
                <span className="office-chat__avatar">{speaker.emoji}</span>
                <motion.div className="office-chat__bubble">
                  <span className="office-chat__speaker">
                    {isCeo && <span className="office-chat__ceo-tag">CEO</span>}
                    {speaker.name}:
                  </span>
                  <span className="office-chat__text">{msg.message}</span>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
