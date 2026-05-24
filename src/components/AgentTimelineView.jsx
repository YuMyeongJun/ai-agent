import { getAgentById } from '../data/agents'

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AgentTimelineView({ messages }) {
  if (messages.length === 0) {
    return <p className="timeline-empty">아직 타임라인 이벤트가 없습니다.</p>
  }

  return (
    <div className="agent-timeline">
      {messages.map((msg, index) => {
        const speaker = getAgentById(msg.speaker) ?? {
          name: msg.speaker,
          emoji: '🤖',
          accent: 'var(--sage)',
        }
        const isLast = index === messages.length - 1

        return (
          <div key={msg.id} className="agent-timeline__item">
            <div className="agent-timeline__rail">
              <span
                className="agent-timeline__dot"
                style={{ '--speaker-accent': speaker.accent }}
              />
              {!isLast && <span className="agent-timeline__line" />}
            </div>
            <div className="agent-timeline__content">
              <div className="agent-timeline__meta">
                <span className="agent-timeline__speaker">
                  {speaker.emoji} {speaker.name}
                </span>
                <span className="mono agent-timeline__time">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="agent-timeline__text">{msg.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
