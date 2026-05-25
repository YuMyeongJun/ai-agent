import { useEffect, useRef, useState } from 'react'
import { CommandCenterOfficeChat } from './CommandCenterOfficeChat'
import { CommandCenterMeetingLog } from './CommandCenterMeetingLog'
import { CommandCenterDeliverablesPanel } from './CommandCenterDeliverablesPanel'
import type { IChatMessage, IDialogueMessage } from '../../../hooks/useMissionStream'
import type { IArtifact } from '../../../models/interface/res/IMissionEventRes'
import type { ITaskArtifact } from '../../../hooks/client/missionClient'
import type { IEmployee } from '../../../models/types/employeeType'

type RightPanelTab = 'chat' | 'meeting' | 'deliverables'

export interface ICommandCenterRightPanelProps {
  chatMessages: IChatMessage[]
  dialogueMessages: IDialogueMessage[]
  taskArtifacts: ITaskArtifact[]
  sessionArtifacts: IArtifact[]
  sessionId: string | null
  missionTitle?: string | null
  employees: IEmployee[]
  error: string | null
  isRunning: boolean
  onViewArtifact: (artifact: IArtifact) => void
}

export const CommandCenterRightPanel = ({
  chatMessages,
  dialogueMessages,
  taskArtifacts,
  sessionArtifacts,
  sessionId,
  missionTitle,
  employees,
  error,
  isRunning,
  onViewArtifact,
}: ICommandCenterRightPanelProps) => {
  const [tab, setTab] = useState<RightPanelTab>('chat')
  const prevArtifactCountRef = useRef(0)

  const artifactCount = Math.max(taskArtifacts.length, sessionArtifacts.length)

  useEffect(() => {
    if (artifactCount > prevArtifactCountRef.current) {
      setTab('deliverables')
    }
    prevArtifactCountRef.current = artifactCount
  }, [artifactCount])

  return (
    <div className="vo-right-panel">
      <div className="vo-right-panel__tabs">
        <button
          type="button"
          className={`vo-right-panel__tab ${tab === 'chat' ? 'vo-right-panel__tab--active' : ''}`}
          onClick={() => setTab('chat')}
        >
          CEO 대화
          {chatMessages.length > 0 && (
            <span className="vo-right-panel__badge">{chatMessages.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`vo-right-panel__tab ${tab === 'meeting' ? 'vo-right-panel__tab--active' : ''}`}
          onClick={() => setTab('meeting')}
        >
          회의실
          {dialogueMessages.length > 0 && (
            <span className="vo-right-panel__badge">{dialogueMessages.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`vo-right-panel__tab ${tab === 'deliverables' ? 'vo-right-panel__tab--active' : ''}`}
          onClick={() => setTab('deliverables')}
        >
          산출물
          {artifactCount > 0 && (
            <span className="vo-right-panel__badge">{artifactCount}</span>
          )}
        </button>
      </div>

      <div className="vo-right-panel__body">
        {tab === 'chat' && (
          <CommandCenterOfficeChat messages={chatMessages} error={error} isRunning={isRunning} />
        )}
        {tab === 'meeting' && (
          <CommandCenterMeetingLog messages={dialogueMessages} employees={employees} />
        )}
        {tab === 'deliverables' && (
          <CommandCenterDeliverablesPanel
            sessionId={sessionId}
            missionTitle={missionTitle}
            taskArtifacts={taskArtifacts}
            sessionArtifacts={sessionArtifacts}
            onViewArtifact={onViewArtifact}
          />
        )}
      </div>
    </div>
  )
}
