import { motion } from 'framer-motion'
import { SUB_AGENTS } from '../data/agents'
import { useMissionSimulation } from '../hooks/useMissionSimulation'
import MainAgent from './MainAgent'
import SubAgent from './SubAgent'
import WorkCard from './WorkCard'
import OfficeChat from './OfficeChat'
import CEOCommandInput from './CEOCommandInput'
import BriefingPanel from './BriefingPanel'
import '../styles/office.css'

const CONNECTION_TARGETS = {
  musicDev: { x2: 200, y2: 40 },
  score: { x2: 360, y2: 200 },
  marketer: { x2: 200, y2: 360 },
  legal: { x2: 40, y2: 200 },
}

export default function MetaverseOffice() {
  const {
    agentStatuses,
    agentWork,
    chatMessages,
    flyingCards,
    briefingResults,
    showBriefing,
    isRunning,
    runMission,
    dismissBriefing,
  } = useMissionSimulation()

  return (
    <motion.div
      className="metaverse-office command-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <header className="office-header">
        <motion.div
          className="office-header__logo"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="office-header__icon">🛰️</span>
          <motion.h1
            className="office-header__title"
            animate={{
              textShadow: [
                '0 0 10px #00d4ff',
                '0 0 24px #00d4ff',
                '0 0 10px #00d4ff',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Metaverse Command Center
          </motion.h1>
          <span className="office-header__subtitle">CEO 지휘 본부</span>
          <span className="office-header__status">
            <span className="office-header__status-dot" />
            {isRunning ? 'OPERATIONS ACTIVE' : 'STANDBY'}
          </span>
        </motion.div>
      </header>

      <motion.div className="command-center__body">
        <section className="office-arena">
          <motion.div
            className="office-arena__scanline"
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="office-arena__grid" />
          <div className="office-arena__corner office-arena__corner--tl" />
          <motion.div className="office-arena__corner office-arena__corner--tr" />
          <div className="office-arena__corner office-arena__corner--bl" />
          <div className="office-arena__corner office-arena__corner--br" />

          <motion.div
            className="office-arena__center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <MainAgent status={agentStatuses.main} />

            <motion.div
              className="office-arena__connections"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 0.6 }}
            >
              <svg viewBox="0 0 400 400" className="connection-lines">
                {SUB_AGENTS.map((agent) => {
                  const target = CONNECTION_TARGETS[agent.id]
                  return (
                    <motion.line
                      key={agent.id}
                      x1="200"
                      y1="200"
                      x2={target.x2}
                      y2={target.y2}
                      stroke="url(#lineGradient)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: isRunning ? [0.3, 0.8, 0.3] : 0.35,
                      }}
                      transition={{
                        pathLength: { duration: 1.5, delay: 0.8 },
                        opacity: { duration: 1.5, repeat: isRunning ? Infinity : 0 },
                      }}
                    />
                  )
                })}
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            <motion.div className="office-arena__cards">
              {flyingCards.map((card) => (
                <WorkCard key={card.id} card={card} />
              ))}
            </motion.div>
          </motion.div>

          {SUB_AGENTS.map((agent) => (
            <SubAgent
              key={agent.id}
              agent={agent}
              status={agentStatuses[agent.id]}
              work={agentWork[agent.id]}
            />
          ))}
        </section>

        <aside className="office-sidebar">
          <OfficeChat messages={chatMessages} />
        </aside>
      </motion.div>

      <BriefingPanel
        results={briefingResults}
        visible={showBriefing}
        onDismiss={dismissBriefing}
      />

      <CEOCommandInput onSubmit={runMission} isRunning={isRunning} />
    </motion.div>
  )
}
