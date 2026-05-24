import { useState, useEffect } from 'react'
import { MAIN_AGENT, SUB_AGENTS } from '../data/agents'
import { useMissionStream } from '../hooks/useMissionStream'
import { useTweaks } from '../hooks/useTweaks'
import AgentNode from './AgentNode'
import AgentListView from './AgentListView'
import AgentTimelineView from './AgentTimelineView'
import WorkCard from './WorkCard'
import OfficeChat from './OfficeChat'
import CEOCommandInput from './CEOCommandInput'
import BriefingPanel from './BriefingPanel'
import ResultViewer from './ResultViewer'
import TweaksPanel, { TweaksFab } from './TweaksPanel'
import '../styles/office.css'
import '../styles/themes.css'

const TOPOLOGY_VIEWS = ['network', 'list', 'timeline']

export default function MetaverseOffice() {
  const {
    agentStatuses,
    agentWork,
    agentArtifacts,
    chatMessages,
    flyingCards,
    briefingResults,
    showBriefing,
    isRunning,
    error,
    runMission,
    resetSession,
    dismissBriefing,
  } = useMissionStream()

  const [tweaks, setTweak] = useTweaks()
  const [selectedAgentId, setSelectedAgentId] = useState('main')
  const [topologyView, setTopologyView] = useState('network')
  const [viewingArtifact, setViewingArtifact] = useState(null)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [clock, setClock] = useState('')

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

  useEffect(() => {
    document.body.style.background = ''
    if (tweaks.palette === 'dusk') {
      document.body.style.background = '#2a2823'
    } else if (tweaks.palette === 'mist') {
      document.body.style.background = '#eef1f3'
    } else {
      document.body.style.background = '#f4efe6'
    }
  }, [tweaks.palette])

  const selectedAgent =
    selectedAgentId === 'main'
      ? MAIN_AGENT
      : SUB_AGENTS.find((a) => a.id === selectedAgentId) ?? MAIN_AGENT

  return (
    <div className="command-center" data-palette={tweaks.palette}>
      <header className="cc-header">
        <div className="cc-header__brand">
          <div className="cc-header__logo">◐</div>
          <div>
            <h1
              className={`cc-header__title ${tweaks.headerStyle === 'serif' ? 'serif' : ''}`}
            >
              Agent Command Center
            </h1>
            <p className="cc-header__subtitle">CEO 지휘 본부 · 5 agents online</p>
          </div>
        </div>

        <div className="cc-header__actions">
          <div className="cc-header__pill">
            <span className="cc-header__ready">
              <span className="cc-header__dot" />
              {isRunning ? '진행 중' : '준비됨'}
            </span>
            <span className="cc-header__sep">|</span>
            <span className="mono">{clock}</span>
          </div>
          <button type="button" className="cc-header__session-btn" onClick={resetSession}>
            새 세션 시작
          </button>
        </div>
      </header>

      <div className="command-center__body">
        <section className="topology-panel">
          <div className="topology-panel__toolbar">
            <div className="topology-panel__label">
              <span className="mono topology-panel__tag">topology</span>
              <span>· 에이전트 네트워크</span>
            </div>
            <div className="topology-panel__views">
              {TOPOLOGY_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`topology-panel__view ${topologyView === view ? 'topology-panel__view--active' : ''}`}
                  onClick={() => setTopologyView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`topology-canvas ${tweaks.showGrid && topologyView === 'network' ? 'canvas-grid' : ''}`}
          >
            {topologyView === 'network' && (
              <>
                <svg className="topology-lines" aria-hidden="true">
                  <line x1="50%" y1="50%" x2="50%" y2="14%" stroke="var(--plum)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                  <line x1="50%" y1="50%" x2="50%" y2="86%" stroke="var(--rose)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                  <line x1="50%" y1="50%" x2="16%" y2="50%" stroke="var(--sand)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                  <line x1="50%" y1="50%" x2="84%" y2="50%" stroke="var(--moss)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                </svg>

                {tweaks.showOrbit && <div className="topology-orbit" />}

                <div className="topology-grid">
                  <AgentNode
                    agent={MAIN_AGENT}
                    status={agentStatuses.main}
                    selected={selectedAgentId === 'main'}
                    onSelect={() => setSelectedAgentId('main')}
                  />
                  {SUB_AGENTS.map((agent) => (
                    <AgentNode
                      key={agent.id}
                      agent={agent}
                      status={agentStatuses[agent.id]}
                      work={agentWork[agent.id]}
                      artifacts={agentArtifacts[agent.id] ?? []}
                      selected={selectedAgentId === agent.id}
                      onSelect={() => setSelectedAgentId(agent.id)}
                      onViewResult={setViewingArtifact}
                    />
                  ))}
                </div>

                <div className="topology-cards">
                  {flyingCards.map((card) => (
                    <WorkCard key={card.id} card={card} />
                  ))}
                </div>
              </>
            )}

            {topologyView === 'list' && (
              <AgentListView
                agentStatuses={agentStatuses}
                agentWork={agentWork}
                selectedAgentId={selectedAgentId}
                onSelect={setSelectedAgentId}
              />
            )}

            {topologyView === 'timeline' && (
              <AgentTimelineView messages={chatMessages} />
            )}
          </div>

          <div className="topology-footer">
            <div
              className="topology-footer__icon"
              style={{ '--agent-accent': selectedAgent.accent, '--agent-accent-bg': selectedAgent.accentBg }}
            >
              {selectedAgent.emoji}
            </div>
            <div className="topology-footer__info">
              <div className="topology-footer__name">
                {selectedAgent.name}
                <span>· {selectedAgent.role}</span>
              </div>
              <div className="topology-footer__desc">{selectedAgent.desc}</div>
            </div>
            {agentArtifacts[selectedAgentId]?.length > 0 ? (
              <button
                type="button"
                className="topology-footer__detail"
                onClick={() => setViewingArtifact(agentArtifacts[selectedAgentId][0])}
              >
                상세 →
              </button>
            ) : (
              <button type="button" className="topology-footer__detail" disabled>
                상세 →
              </button>
            )}
          </div>
        </section>

        <aside className="log-sidebar">
          <OfficeChat messages={chatMessages} error={error} isRunning={isRunning} />
        </aside>
      </div>

      <CEOCommandInput onSubmit={runMission} isRunning={isRunning} />

      <BriefingPanel results={briefingResults} visible={showBriefing} onDismiss={dismissBriefing} />

      <ResultViewer
        artifact={viewingArtifact}
        visible={Boolean(viewingArtifact)}
        onClose={() => setViewingArtifact(null)}
      />

      {!tweaksOpen && <TweaksFab onClick={() => setTweaksOpen(true)} />}
      <TweaksPanel
        tweaks={tweaks}
        setTweak={setTweak}
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
      />
    </div>
  )
}
