import { useState, useEffect, useCallback, useMemo } from 'react'
import { useEmployees } from '../../hooks/useEmployees'
import { useMissionStream } from '../../hooks/useMissionStream'
import { useOfficeMovement } from '../../hooks/useOfficeMovement'
import { useOfficePresence } from '../../hooks/useOfficePresence'
import { OfficeCanvas } from './OfficeCanvas'
import { EmployeePanel } from './EmployeePanel'
import { CommandCenterRightPanel } from '../pages/command-center/CommandCenterRightPanel'
import { CommandCenterCEOCommandInput } from '../pages/command-center/CommandCenterCEOCommandInput'
import { CommandCenterBriefingPanel } from '../pages/command-center/CommandCenterBriefingPanel'
import { CommandCenterResultViewer } from '../pages/command-center/CommandCenterResultViewer'
import { CommandCenterBackendStatus } from '../pages/command-center/CommandCenterBackendStatus'
import { CommandCenterWorkCard } from '../pages/command-center/CommandCenterWorkCard'
import type { IArtifact } from '../../models/interface/res/IMissionEventRes'
import { artifactFullUrl } from '../../hooks/client/missionClient'

export const VirtualOffice = () => {
  const {
    employees,
    activeEmployees,
    createEmployee,
    updateEmployee,
    removeEmployee,
  } = useEmployees()

  const {
    agentStatuses,
    agentWork,
    agentArtifacts,
    chatMessages,
    dialogueMessages,
    sessionArtifacts,
    taskArtifacts,
    missionTitle,
    flyingCards,
    briefingResults,
    showBriefing,
    isRunning,
    error,
    pipelineStages,
    activeStageIndex,
    moveTargets,
    sessionId,
    sendMessage,
    resetSession,
    dismissBriefing,
  } = useMissionStream()

  const { playerPos } = useOfficeMovement({ x: 34, y: 17 })
  const employeePositions = useOfficePresence(
    employees.filter((emp) => emp.active),
    moveTargets,
  )

  const speechBubbles = useMemo(() => {
    const map: Record<string, string> = {}
    for (const msg of chatMessages) {
      if (msg.streaming || !msg.message.trim()) continue
      const text = msg.message.trim().replace(/\s+/g, ' ')
      map[msg.speaker] = text.length > 72 ? `${text.slice(0, 72)}…` : text
    }
    return map
  }, [chatMessages])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null)
  const [viewingArtifact, setViewingArtifact] = useState<IArtifact | null>(null)
  const [clock, setClock] = useState('')
  const [assignMode, setAssignMode] = useState<'all' | 'selected'>('all')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} KST`,
      )
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const handleSubmitCommand = useCallback(
    (command: string, options?: { forceMission?: boolean }) => {
      const ids =
        assignMode === 'selected' && selectedEmployeeId ? [selectedEmployeeId] : undefined
      sendMessage(command, { employeeIds: ids, forceMission: options?.forceMission })
    },
    [assignMode, selectedEmployeeId, sendMessage],
  )

  const handleViewArtifact = useCallback((artifact: IArtifact) => {
    if (artifact.kind === 'markdown' || artifact.kind === 'code') {
      setViewingArtifact(artifact)
    } else if (artifact.url) {
      window.open(artifactFullUrl(artifact.url), '_blank')
    }
  }, [])

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId)
  const selectedWork = selectedEmployeeId ? agentWork[selectedEmployeeId] : null
  const selectedArtifacts = selectedEmployeeId ? agentArtifacts[selectedEmployeeId] ?? [] : []

  return (
    <div className="virtual-office">
      <CommandCenterBackendStatus />

      <header className="vo-header">
        <div className="vo-header__brand">
          <div className="vo-header__logo">🏢</div>
          <div>
            <h1 className="vo-header__title">AI Virtual Office</h1>
            <p className="vo-header__subtitle">
              Gather-style · {activeEmployees.length}명 근무 중
            </p>
          </div>
        </div>
        <div className="vo-header__actions">
          <span className="vo-header__pill mono">
            {isRunning ? '● 업무 진행 중' : '○ 대기'} · {clock}
          </span>
          <button type="button" className="vo-header__btn" onClick={resetSession}>
            새 세션
          </button>
        </div>
      </header>

      <div className="vo-body">
        <aside className="vo-sidebar vo-sidebar--left">
          <EmployeePanel
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelect={setSelectedEmployeeId}
            onCreate={createEmployee}
            onUpdate={updateEmployee}
            onRemove={removeEmployee}
            selectedDeskId={selectedDeskId}
          />
        </aside>

        <main className="vo-main">
          <div className="vo-main__toolbar">
            <label className="vo-assign-mode">
              <input
                type="radio"
                name="assignMode"
                checked={assignMode === 'all'}
                onChange={() => setAssignMode('all')}
              />
              전체 파이프라인 (기획→개발→디자인→리뷰→QA)
            </label>
            <label className="vo-assign-mode">
              <input
                type="radio"
                name="assignMode"
                checked={assignMode === 'selected'}
                onChange={() => setAssignMode('selected')}
                disabled={!selectedEmployeeId}
              />
              선택 직원만
              {selectedEmployee && ` (${selectedEmployee.name})`}
            </label>
          </div>

          {pipelineStages.length > 0 && (
            <div className="vo-pipeline">
              {pipelineStages.map((stage, index) => (
                <div
                  key={stage.employeeId}
                  className={`vo-pipeline__stage ${activeStageIndex === index + 1 ? 'vo-pipeline__stage--active' : ''} ${activeStageIndex > index + 1 ? 'vo-pipeline__stage--done' : ''}`}
                >
                  <span className="vo-pipeline__label">{stage.roleLabel}</span>
                  <span className="vo-pipeline__name">{stage.employeeName}</span>
                </div>
              ))}
            </div>
          )}

          <div className="vo-canvas-scroll">
            <OfficeCanvas
              employees={employees.filter((emp) => emp.active)}
              agentStatuses={agentStatuses}
              employeePositions={employeePositions}
              speechBubbles={speechBubbles}
              playerPos={playerPos}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={setSelectedEmployeeId}
              onSelectDesk={setSelectedDeskId}
            />
            <div className="vo-flying-cards">
              {flyingCards.map((card) => (
                <CommandCenterWorkCard key={card.id} card={card} />
              ))}
            </div>
          </div>

          {selectedEmployee && (
            <div className="vo-selected-bar">
              <span>{selectedEmployee.emoji} {selectedEmployee.name}</span>
              <span>{selectedEmployee.role}</span>
              {selectedWork?.active && (
                <span className="vo-progress">{selectedWork.message} ({selectedWork.progress}%)</span>
              )}
              {selectedArtifacts.map((artifact) => (
                <button
                  key={artifact.filename}
                  type="button"
                  className="vo-artifact-btn"
                  onClick={() => handleViewArtifact(artifact)}
                >
                  {artifact.title}
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="vo-sidebar vo-sidebar--right">
          <CommandCenterRightPanel
            chatMessages={chatMessages}
            dialogueMessages={dialogueMessages}
            taskArtifacts={taskArtifacts}
            sessionArtifacts={sessionArtifacts}
            sessionId={sessionId}
            missionTitle={missionTitle}
            employees={employees}
            error={error}
            isRunning={isRunning}
            onViewArtifact={handleViewArtifact}
          />
        </aside>
      </div>

      <CommandCenterCEOCommandInput onSubmit={handleSubmitCommand} isRunning={isRunning} />

      <CommandCenterBriefingPanel
        results={briefingResults}
        visible={showBriefing}
        onDismiss={dismissBriefing}
        onPlayTrack={() => {}}
        onViewScore={() => {}}
      />

      <CommandCenterResultViewer
        artifact={viewingArtifact}
        visible={Boolean(viewingArtifact)}
        onClose={() => setViewingArtifact(null)}
        onPlayInMonitor={() => setViewingArtifact(null)}
        sessionId={null}
      />
    </div>
  )
}
