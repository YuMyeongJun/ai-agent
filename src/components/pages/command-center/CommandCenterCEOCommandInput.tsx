import { useState, useRef, useEffect } from 'react'

const QUICK_COMMANDS = [
  '신규 UI 프로젝트 기획해줘',
  '프론트엔드 아키텍처 설계해줘',
  '홍보용 쇼츠 콘텐츠 제작해줘',
  '주요 보안 취약점 점검해줘',
]

export interface ICommandCenterCEOCommandInputProps {
  onSubmit: (command: string, options?: { forceMission?: boolean }) => void
  isRunning: boolean
}

export const CommandCenterCEOCommandInput = ({
  onSubmit,
  isRunning,
}: ICommandCenterCEOCommandInputProps) => {
  const [command, setCommand] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [command])

  const submit = (forceMission = false) => {
    if (command.trim() && !isRunning) {
      onSubmit(command, { forceMission })
      setCommand('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(e.metaKey || e.ctrlKey)
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
            placeholder="Main Agent와 대화하세요. Enter=대화 · 업무 지시 시 확인 후 진행 · ⌘/Ctrl+Enter=바로 팀 실행"
            disabled={isRunning}
            className="ceo-command__textarea"
            rows={1}
          />
          <button
            type="submit"
            className="ceo-command__send"
            disabled={isRunning || !command.trim()}
          >
            대화 <span>↵</span>
          </button>
          <button
            type="button"
            className="ceo-command__run"
            disabled={isRunning || !command.trim()}
            onClick={() => submit(true)}
          >
            팀 실행
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
