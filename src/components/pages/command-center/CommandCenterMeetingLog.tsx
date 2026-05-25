import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { IDialogueMessage } from '../../../hooks/useMissionStream'
import type { IEmployee } from '../../../models/types/employeeType'
import { MAIN_AGENT } from '../../../models/types/employeeType'

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resolveEmoji(agentId: string, employees: IEmployee[]) {
  if (agentId === 'main') return MAIN_AGENT.emoji
  if (agentId === 'team') return '👥'
  const emp = employees.find((e) => e.id === agentId)
  return emp?.emoji ?? '🤖'
}

const CONTEXT_LABELS: Record<string, string> = {
  standup: '스탠드업',
  meeting: '회의실',
  handoff: '핸드오프',
}

export interface ICommandCenterMeetingLogProps {
  messages: IDialogueMessage[]
  employees: IEmployee[]
}

export const CommandCenterMeetingLog = ({
  messages,
  employees,
}: ICommandCenterMeetingLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="meeting-log">
      <div className="meeting-log__header">
        <h3>회의실 대화</h3>
        <span className="mono meeting-log__count">{messages.length} msgs</span>
      </div>

      <div className="meeting-log__messages" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <p className="meeting-log__empty">
              파이프라인 실행 시 에이전트 간 대화가 여기에 표시됩니다.
            </p>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className="meeting-log__item"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="meeting-log__route">
                <span className="meeting-log__from">
                  {resolveEmoji(msg.fromAgentId, employees)} {msg.fromName}
                </span>
                <span className="meeting-log__arrow">→</span>
                <span className="meeting-log__to">
                  {resolveEmoji(msg.toAgentId, employees)} {msg.toName}
                </span>
                {msg.context && (
                  <span className="meeting-log__context">
                    {CONTEXT_LABELS[msg.context] ?? msg.context}
                    {msg.stage ? ` · ${msg.stage}단계` : ''}
                  </span>
                )}
                <span className="mono meeting-log__time">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="meeting-log__content">{msg.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
