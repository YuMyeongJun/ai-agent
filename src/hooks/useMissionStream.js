import { useCallback, useEffect, useRef, useState } from 'react'
import { AGENT_STATUS, MAIN_AGENT, SUB_AGENTS } from '../data/agents'
import { streamMission } from '../api/missionApi'

function createInitialStatuses() {
  const statuses = { [MAIN_AGENT.id]: AGENT_STATUS.IDLE }
  SUB_AGENTS.forEach((agent) => {
    statuses[agent.id] = AGENT_STATUS.IDLE
  })
  return statuses
}

function createInitialWorkStates() {
  const work = {}
  SUB_AGENTS.forEach((agent) => {
    work[agent.id] = { message: '', progress: 0, active: false }
  })
  return work
}

function createInitialArtifacts() {
  const artifacts = {}
  SUB_AGENTS.forEach((agent) => {
    artifacts[agent.id] = []
  })
  return artifacts
}

export function useMissionStream() {
  const [agentStatuses, setAgentStatuses] = useState(createInitialStatuses)
  const [agentWork, setAgentWork] = useState(createInitialWorkStates)
  const [agentArtifacts, setAgentArtifacts] = useState(createInitialArtifacts)
  const [chatMessages, setChatMessages] = useState([])
  const [flyingCards, setFlyingCards] = useState([])
  const [briefingResults, setBriefingResults] = useState([])
  const [showBriefing, setShowBriefing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const cardIdRef = useRef(0)
  const abortRef = useRef(false)

  const setStatus = useCallback((agentId, status) => {
    setAgentStatuses((prev) => ({ ...prev, [agentId]: status }))
  }, [])

  const launchCard = useCallback((agentId, label) => {
    const id = ++cardIdRef.current
    setFlyingCards((prev) => [...prev, { id, agentId, label }])
    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((c) => c.id !== id))
    }, 1200)
  }, [])

  const appendChatDelta = useCallback((messageId, delta) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, message: msg.message + delta } : msg,
      ),
    )
  }, [])

  const handleEvent = useCallback(
    (event) => {
      switch (event.type) {
        case 'session':
          setSessionId(event.sessionId)
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
          break

        case 'briefing':
          setBriefingResults(event.results ?? [])
          setShowBriefing(true)
          break

        case 'done':
          setIsRunning(false)
          break

        case 'error':
          setError(event.message)
          setIsRunning(false)
          break

        default:
          break
      }
    },
    [appendChatDelta, launchCard, setStatus],
  )

  const runMission = useCallback(
    async (command) => {
      if (!command.trim() || isRunning) return

      abortRef.current = false
      setIsRunning(true)
      setError(null)
      setFlyingCards([])
      setBriefingResults([])
      setShowBriefing(false)
      setSessionId(null)
      setAgentStatuses(createInitialStatuses())
      setAgentWork(createInitialWorkStates())
      setAgentArtifacts(createInitialArtifacts())
      setChatMessages([
        {
          id: `ceo-${Date.now()}`,
          speaker: 'ceo',
          message: command.trim(),
          streaming: false,
          timestamp: new Date(),
        },
      ])

      try {
        for await (const event of streamMission(command.trim())) {
          if (abortRef.current) break
          handleEvent(event)
        }
      } catch (err) {
        setError(err.message ?? '미션 실행 중 오류가 발생했습니다.')
        setIsRunning(false)
      }
    },
    [handleEvent, isRunning],
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
    setAgentStatuses(createInitialStatuses())
    setAgentWork(createInitialWorkStates())
    setAgentArtifacts(createInitialArtifacts())
    setChatMessages([])
    abortRef.current = false
  }, [])

  return {
    agentStatuses,
    agentWork,
    agentArtifacts,
    chatMessages,
    flyingCards,
    briefingResults,
    showBriefing,
    isRunning,
    sessionId,
    error,
    runMission,
    resetSession,
    dismissBriefing,
  }
}
