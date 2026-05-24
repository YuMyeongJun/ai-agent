import { useState, useRef, useEffect } from 'react'

const QUICK_COMMANDS = [
  'C장조 Lo-fi 트랙 만들어줘',
  '마르코프 체인 Ambient 곡 생성해',
  '블로그 + Shorts 콘텐츠 패키지 기획해',
  '저작권 안전성 빠르게 확인',
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

  const submit = () => {
    if (command.trim() && !isRunning) {
      onSubmit(command)
      setCommand('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="ceo-command">
      <div className="ceo-command__panel">
        <form onSubmit={handleSubmit} className="ceo-command__form">
          <div className="ceo-command__badge">♛</div>
          <textarea
            ref={textareaRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="에이전트에게 명령을 내려보세요. (Enter: 전송, Shift+Enter: 줄바꿈)"
            disabled={isRunning}
            className="ceo-command__textarea"
            rows={1}
          />
          <button
            type="submit"
            className="ceo-command__send"
            disabled={isRunning || !command.trim()}
          >
            전송 <span>↵</span>
          </button>
        </form>

        <div className="ceo-command__quick-row">
          <span className="mono ceo-command__quick-label">QUICK</span>
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              className="ceo-command__quick"
              disabled={isRunning}
              onClick={() => setCommand(cmd)}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
