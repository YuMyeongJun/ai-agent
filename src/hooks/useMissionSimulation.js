import { useCallback, useEffect, useRef, useState } from 'react'
import { AGENT_STATUS, MAIN_AGENT, SUB_AGENTS } from '../data/agents'
import { buildMissionScript } from '../data/mockMission'

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

export function useMissionSimulation() {
  const [agentStatuses, setAgentStatuses] = useState(createInitialStatuses)
  const [agentWork, setAgentWork] = useState(createInitialWorkStates)
  const [chatMessages, setChatMessages] = useState([])
  const [flyingCards, setFlyingCards] = useState([])
  const [briefingResults, setBriefingResults] = useState([])
  const [showBriefing, setShowBriefing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const timeoutsRef = useRef([])
  const progressIntervalsRef = useRef([])
  const cardIdRef = useRef(0)

  const clearSimulation = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    progressIntervalsRef.current.forEach(clearInterval)
    progressIntervalsRef.current = []
  }, [])

  useEffect(() => clearSimulation, [clearSimulation])

  const addChatMessage = useCallback((speaker, message) => {
    setChatMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, speaker, message, timestamp: new Date() },
    ])
  }, [])

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

  const startWorkProgress = useCallback((agentId, workMessage, duration = 3000) => {
    setAgentWork((prev) => ({
      ...prev,
      [agentId]: { message: workMessage, progress: 0, active: true },
    }))

    const steps = 20
    const stepMs = duration / steps
    let step = 0

    const interval = setInterval(() => {
      step += 1
      const progress = Math.min(Math.round((step / steps) * 100), 100)
      setAgentWork((prev) => ({
        ...prev,
        [agentId]: { ...prev[agentId], progress },
      }))

      if (step >= steps) {
        clearInterval(interval)
        progressIntervalsRef.current = progressIntervalsRef.current.filter((i) => i !== interval)
      }
    }, stepMs)

    progressIntervalsRef.current.push(interval)
  }, [])

  const stopWorkProgress = useCallback((agentId) => {
    setAgentWork((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], progress: 100, active: false },
    }))
    setTimeout(() => {
      setAgentWork((prev) => ({
        ...prev,
        [agentId]: { message: '', progress: 0, active: false },
      }))
    }, 1200)
  }, [])

  const runMission = useCallback(
    (command) => {
      if (!command.trim() || isRunning) return

      clearSimulation()
      setIsRunning(true)
      setFlyingCards([])
      setBriefingResults([])
      setShowBriefing(false)
      setAgentStatuses(createInitialStatuses())
      setAgentWork(createInitialWorkStates())

      addChatMessage('ceo', command.trim())

      const script = buildMissionScript(command.trim())

      script.forEach((step) => {
        const timeout = setTimeout(() => {
          switch (step.type) {
            case 'status':
              setStatus(step.agentId, step.status)
              break

            case 'chat':
              addChatMessage(step.speaker, step.message)
              break

            case 'assign':
              addChatMessage(step.chat.speaker, step.chat.message)
              launchCard(step.agentId, step.cardLabel)
              setStatus(step.agentId, AGENT_STATUS.WORKING)
              startWorkProgress(step.agentId, step.workMessage, step.duration)
              setTimeout(() => {
                addChatMessage(step.response.speaker, step.response.message)
              }, 600)
              break

            case 'report':
              setStatus(step.agentId, AGENT_STATUS.REPORTING)
              stopWorkProgress(step.agentId)
              addChatMessage(step.agentId, step.message)
              setTimeout(() => {
                setStatus(step.agentId, AGENT_STATUS.IDLE)
              }, 1500)
              break

            case 'briefing':
              setBriefingResults(step.results)
              setShowBriefing(true)
              break

            case 'reset':
              setIsRunning(false)
              break

            default:
              break
          }
        }, step.delay)

        timeoutsRef.current.push(timeout)
      })
    },
    [
      isRunning,
      clearSimulation,
      setStatus,
      addChatMessage,
      launchCard,
      startWorkProgress,
      stopWorkProgress,
    ],
  )

  const dismissBriefing = useCallback(() => {
    setShowBriefing(false)
  }, [])

  return {
    agentStatuses,
    agentWork,
    chatMessages,
    flyingCards,
    briefingResults,
    showBriefing,
    isRunning,
    runMission,
    dismissBriefing,
  }
}
