import { useCallback, useEffect, useRef, useState } from 'react'
import { AGENT_STATUS, MAIN_AGENT } from '../models/types/employeeType'
import type { AgentStatus } from '../models/types/employeeType'
import type { IArtifact, IBriefingItem, IMissionEventRes } from '../models/interface/res/IMissionEventRes'
import type { IMoveTarget } from '../office/officeMap'
import { resolveMoveTarget } from '../office/officeMap'
import { streamChat, fetchChatHistory, fetchTaskArtifacts } from './client/missionClient'
import type { ITaskArtifact } from './client/missionClient'

export interface IChatMessage {
  id: string
  speaker: string
  message: string
  streaming?: boolean
  timestamp: Date
  persisted?: boolean
}

export interface IDialogueMessage {
  id: string
  fromAgentId: string
  toAgentId: string
  fromName: string
  toName: string
  content: string
  context?: string
  stage?: number
  timestamp: Date
}

export interface IAgentWork {
  message: string
  progress: number
  active: boolean
}

export interface IFlyingCard {
  id: number
  agentId: string
  label: string
}

function createInitialStatuses(): Record<string, AgentStatus> {
  return { [MAIN_AGENT.id]: AGENT_STATUS.IDLE }
}

export function useMissionStream() {
  const [agentStatuses, setAgentStatuses] = useState(createInitialStatuses)
  const [agentWork, setAgentWork] = useState<Record<string, IAgentWork>>({})
  const [agentArtifacts, setAgentArtifacts] = useState<Record<string, IArtifact[]>>({})
  const [chatMessages, setChatMessages] = useState<IChatMessage[]>([])
  const [dialogueMessages, setDialogueMessages] = useState<IDialogueMessage[]>([])
  const [sessionArtifacts, setSessionArtifacts] = useState<IArtifact[]>([])
  const [taskArtifacts, setTaskArtifacts] = useState<ITaskArtifact[]>([])
  const [missionTitle, setMissionTitle] = useState<string | null>(null)
  const [flyingCards, setFlyingCards] = useState<IFlyingCard[]>([])
  const [briefingResults, setBriefingResults] = useState<IBriefingItem[]>([])
  const [showBriefing, setShowBriefing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pipelineStages, setPipelineStages] = useState<
    Array<{ employeeId: string; employeeName: string; roleTemplateId: string; roleLabel: string; order: number }>
  >([])
  const [activeStageIndex, setActiveStageIndex] = useState(0)
  const [moveTargets, setMoveTargets] = useState<Record<string, IMoveTarget>>({})
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const cardIdRef = useRef(0)
  const abortRef = useRef(false)
  const historyLoadedRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const loadSessionHistory = useCallback(async (sid: string) => {
    if (historyLoadedRef.current === sid) return
    historyLoadedRef.current = sid
    const history = await fetchChatHistory(sid)
    if (!history.length) return

    const restored: IChatMessage[] = history.map((entry, index) => ({
      id: `hist-${sid}-${index}`,
      speaker: entry.role === 'user' ? 'ceo' : 'main',
      message: entry.content,
      streaming: false,
      timestamp: new Date(),
      persisted: true,
    }))

    setChatMessages((prev) => {
      const live = prev.filter((msg) => !msg.persisted)
      if (live.length === 0) return restored
      const restoredIds = new Set(restored.map((m) => m.message))
      const uniqueRestored = restored.filter((m) => !live.some((l) => l.message === m.message))
      return [...uniqueRestored, ...live]
    })
  }, [])

  const refreshTaskArtifacts = useCallback(async (sid: string) => {
    const data = await fetchTaskArtifacts(sid)
    setTaskArtifacts(data.artifacts ?? [])
    if (data.mission) setMissionTitle(data.mission)
  }, [])

  const setStatus = useCallback((agentId: string, status: AgentStatus) => {
    setAgentStatuses((prev) => ({ ...prev, [agentId]: status }))
  }, [])

  const launchCard = useCallback((agentId: string, label: string) => {
    const id = ++cardIdRef.current
    setFlyingCards((prev) => [...prev, { id, agentId, label }])
    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((c) => c.id !== id))
    }, 1200)
  }, [])

  const appendChatDelta = useCallback((messageId: string, delta: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, message: msg.message + delta } : msg,
      ),
    )
  }, [])

  const handleEvent = useCallback(
    (event: IMissionEventRes) => {
      switch (event.type) {
        case 'session':
          setSessionId(event.sessionId)
          setChatSessionId(event.sessionId)
          sessionIdRef.current = event.sessionId
          void loadSessionHistory(event.sessionId)
          void refreshTaskArtifacts(event.sessionId)
          break

        case 'status':
          setStatus(event.agentId, event.status)
          break

        case 'chat_start':
          setChatMessages((prev) => [
            ...prev,
            {
              id: event.messageId,
              speaker: event.speaker,
              message: '',
              streaming: true,
              timestamp: new Date(),
            },
          ])
          break

        case 'chat_delta':
          appendChatDelta(event.messageId, event.delta)
          break

        case 'chat_end':
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === event.messageId ? { ...msg, streaming: false } : msg,
            ),
          )
          break

        case 'assign':
          launchCard(event.agentId, event.cardLabel)
          setStatus(event.agentId, AGENT_STATUS.WORKING)
          if (event.stage) setActiveStageIndex(event.stage)
          break

        case 'pipeline':
          setPipelineStages(event.stages ?? [])
          setActiveStageIndex(0)
          break

        case 'work':
          setAgentWork((prev) => ({
            ...prev,
            [event.agentId]: {
              message: event.message,
              progress: event.progress,
              active: event.progress < 100,
            },
          }))
          break

        case 'artifact':
          setAgentArtifacts((prev) => ({
            ...prev,
            [event.agentId]: [...(prev[event.agentId] ?? []), event],
          }))
          setSessionArtifacts((prev) => {
            if (prev.some((a) => a.filename === event.filename)) return prev
            return [...prev, event]
          })
          break

        case 'dialogue':
          setDialogueMessages((prev) => [
            ...prev,
            {
              id: `dlg-${Date.now()}-${prev.length}`,
              fromAgentId: event.fromAgentId,
              toAgentId: event.toAgentId,
              fromName: event.fromName,
              toName: event.toName,
              content: event.content,
              context: event.context,
              stage: event.stage,
              timestamp: new Date(),
            },
          ])
          break

        case 'briefing':
          setBriefingResults(event.results ?? [])
          setShowBriefing(true)
          break

        case 'done':
          setIsRunning(false)
          if (sessionIdRef.current) void refreshTaskArtifacts(sessionIdRef.current)
          break

        case 'error':
          setError(event.message)
          setIsRunning(false)
          break

        case 'move': {
          const target = resolveMoveTarget(event)
          setMoveTargets((prev) => ({ ...prev, [event.agentId]: target }))
          break
        }

        default:
          break
      }
    },
    [appendChatDelta, launchCard, loadSessionHistory, refreshTaskArtifacts, setStatus],
  )

  const sendMessage = useCallback(
    async (
      message: string,
      options: { employeeIds?: string[]; forceMission?: boolean } = {},
    ) => {
      if (!message.trim() || isRunning) return

      abortRef.current = false
      setIsRunning(true)
      setError(null)
      setFlyingCards([])
      setBriefingResults([])
      setShowBriefing(false)

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ceo-${Date.now()}`,
          speaker: 'ceo',
          message: message.trim(),
          streaming: false,
          timestamp: new Date(),
        },
      ])

      try {
        let receivedTerminal = false
        for await (const event of streamChat(message.trim(), {
          sessionId: chatSessionId,
          employeeIds: options.employeeIds,
          forceMission: options.forceMission,
        })) {
          if (abortRef.current) break
          if (event.type === 'done' || event.type === 'error') {
            receivedTerminal = true
          }
          handleEvent(event)
        }
        if (!receivedTerminal && !abortRef.current) {
          setIsRunning(false)
          setError('서버 응답이 중간에 끊겼습니다. 백엔드가 실행 중인지 확인해 주세요.')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '대화 중 오류가 발생했습니다.'
        setError(msg)
        setIsRunning(false)
      }
    },
    [handleEvent, isRunning, chatSessionId],
  )

  const runMission = useCallback(
    async (command: string, employeeIds?: string[]) => {
      await sendMessage(command, { employeeIds, forceMission: true })
    },
    [sendMessage],
  )

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const dismissBriefing = useCallback(() => {
    setShowBriefing(false)
  }, [])

  const resetSession = useCallback(() => {
    abortRef.current = true
    setIsRunning(false)
    setError(null)
    setFlyingCards([])
    setBriefingResults([])
    setShowBriefing(false)
    setSessionId(null)
    sessionIdRef.current = null
    setPipelineStages([])
    setActiveStageIndex(0)
    setAgentStatuses(createInitialStatuses())
    setAgentWork({})
    setAgentArtifacts({})
    setChatMessages([])
    setDialogueMessages([])
    setSessionArtifacts([])
    setTaskArtifacts([])
    setMissionTitle(null)
    setMoveTargets({})
    historyLoadedRef.current = null
    abortRef.current = false
  }, [])

  return {
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
    sessionId,
    error,
    pipelineStages,
    activeStageIndex,
    moveTargets,
    chatSessionId,
    sendMessage,
    runMission,
    resetSession,
    dismissBriefing,
  }
}
