import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getAgentById } from '../data/agents'

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OfficeChat({ messages, error, isRunning }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isRunning])

  return (
    <div className="office-chat">
      <div className="office-chat__header">
        <div className="office-chat__title-row">
          <h3>Command Log</h3>
          <span className="mono office-chat__count">{messages.length} msgs</span>
        </div>
        <span className="office-chat__live">
          <span className="office-chat__live-dot" />
          live
        </span>
      </div>

      <div className="office-chat__messages" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && !error && (
            <p className="office-chat__empty">CEO 명령을 내리면 실시간 통신 로그가 표시됩니다.</p>
          )}
          {messages.map((msg) => {
            const speaker = getAgentById(msg.speaker) ?? {
              name: msg.speaker,
              emoji: '🤖',
              accent: 'var(--sage)',
              accentBg: 'var(--sage-bg)',
            }
            const isCeo = msg.speaker === 'ceo'

            return (
              <motion.div
                key={msg.id}
                className={`log-message ${isCeo ? 'log-message--ceo' : ''}`}
                style={{ '--speaker-accent': speaker.accent, '--speaker-bg': speaker.accentBg }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="log-message__avatar">{speaker.emoji}</span>
                <div className="log-message__bubble">
                  <div className="log-message__meta">
                    <span className="log-message__name">{speaker.name}</span>
                    <span className="mono log-message__time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="log-message__text">
                    {msg.message}
                    {msg.streaming && <span className="log-message__cursor">▍</span>}
                  </p>
                </div>
              </motion.div>
            )
          })}
          {isRunning && messages.some((m) => m.streaming) && (
            <p className="office-chat__composing">에이전트가 응답을 작성중이에요…</p>
          )}
          {error && <div className="office-chat__error">⚠️ {error}</div>}
        </AnimatePresence>
      </div>
    </div>
  )
}
