import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

const QUICK_COMMANDS = [
  'C장조 Lo-fi 트랙 만들어줘',
  '마르코프 체인 Ambient 곡 생성해',
  '블로그 + Shorts 콘텐츠 패키지 기획해',
]

export default function CEOCommandInput({ onSubmit, isRunning }) {
  const [command, setCommand] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [command])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (command.trim() && !isRunning) {
      onSubmit(command)
      setCommand('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <motion.div
      className="ceo-command"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <motion.div
        className="ceo-command__container"
      >
        <form onSubmit={handleSubmit} className="ceo-command__form">
          <div className="ceo-command__badge">
            <span className="ceo-command__avatar">👑</span>
            <span className="ceo-command__tag">CEO</span>
          </div>

          <div className="ceo-command__input-wrap">
            <textarea
              ref={textareaRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="명령을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
              disabled={isRunning}
              className="ceo-command__textarea"
              rows={1}
            />
          </div>

          <motion.button
            type="submit"
            className="ceo-command__send"
            disabled={isRunning || !command.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="명령 전송"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </form>

        <motion.div
          className="ceo-command__toolbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="ceo-command__hint">
            {isRunning ? '⚡ 팀이 명령을 수행 중입니다...' : '💡 빠른 명령:'}
          </span>
          {!isRunning &&
            QUICK_COMMANDS.map((cmd) => (
              <motion.button
                key={cmd}
                type="button"
                className="ceo-command__quick"
                onClick={() => setCommand(cmd)}
                whileHover={{ scale: 1.02, borderColor: 'rgba(255, 215, 0, 0.5)' }}
                whileTap={{ scale: 0.98 }}
              >
                {cmd}
              </motion.button>
            ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
