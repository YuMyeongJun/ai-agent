const { useState, useEffect, useRef, useMemo } = React;

/* ============== DATA ============== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "paper",
  "showGrid": true,
  "density": "comfortable",
  "headerStyle": "serif",
  "showOrbit": true
}/*EDITMODE-END*/;

const AGENTS = {
  main: {
    id: 'main',
    name: 'Main Agent',
    role: '팀장',
    sub: 'Orchestrator',
    icon: '🧠',
    accent: 'var(--sage)',
    accentBg: 'var(--sage-bg)',
    desc: '명령을 분해하고 적절한 에이전트에게 위임합니다.',
    status: 'active',
  },
  music: {
    id: 'music',
    name: 'Music Dev',
    role: '음악 개발',
    sub: 'Composer',
    icon: '🎹',
    accent: 'var(--plum)',
    accentBg: 'var(--plum-bg)',
    desc: 'Python + music21 기반으로 트랙을 작곡합니다.',
    status: 'idle',
  },
  legal: {
    id: 'legal',
    name: 'Legal Auditor',
    role: '법무 검토',
    sub: 'Auditor',
    icon: '⚖️',
    accent: 'var(--sand)',
    accentBg: 'var(--sand-bg)',
    desc: '저작권 및 알고리즘 안전성을 검토합니다.',
    status: 'idle',
  },
  score: {
    id: 'score',
    name: 'Score Specialist',
    role: '악보 변환',
    sub: 'Engraver',
    icon: '𝄞',
    accent: 'var(--moss)',
    accentBg: 'var(--moss-bg)',
    desc: 'MusicXML과 PDF 악보를 렌더링합니다.',
    status: 'idle',
  },
  sns: {
    id: 'sns',
    name: 'SNS Marketer',
    role: '마케팅',
    sub: 'Writer',
    icon: '✏️',
    accent: 'var(--rose)',
    accentBg: 'var(--rose-bg)',
    desc: '블로그·SNS 콘텐츠 카피를 작성합니다.',
    status: 'idle',
  },
};

const INITIAL_LOG = [
  { who: 'ceo',    text: '안녕? 오늘 작업 시작해볼까요.', t: '14:02' },
  { who: 'main',   text: '명령 확인했습니다, CEO님. 업무를 배분합니다.', t: '14:02' },
  { who: 'main',   text: '@Music Dev, 마르코프 체인 기반 Lo-fi 트랙 코드를 작성해주세요.', t: '14:03' },
  { who: 'music',  text: '알겠습니다! Python + music21 파이프라인 가동합니다.', t: '14:03' },
  { who: 'main',   text: '@Score, Music Dev 결과물을 악보로 변환해줘.', t: '14:04' },
  { who: 'score',  text: 'MusicXML + PDF 렌더링 시작합니다.', t: '14:04' },
  { who: 'main',   text: '@Marketer, 네이버 블로그용 포스팅 초안 작성해.', t: '14:05' },
  { who: 'sns',    text: 'Hook + 알고리즘 설명 + CTA 구조로 진행할게요!', t: '14:05' },
  { who: 'main',   text: '@Legal, 알고리즘 생성물 저작권 안전성 검토 부탁.', t: '14:06' },
  { who: 'legal',  text: '마르코프/유클리드 알고리즘 — 카피라이트 이슈 없음 확인.', t: '14:07' },
];

const QUICK_COMMANDS = [
  'C장조 Lo-fi 트랙 만들어줘',
  '마르코프 체인 Ambient 곡 생성해',
  '블로그 + Shorts 콘텐츠 패키지 기획해',
  '저작권 안전성 빠르게 확인',
];

/* ============== HELPERS ============== */

function whoMeta(who) {
  if (who === 'ceo') {
    return { name: 'CEO', accent: 'var(--terra)', bg: 'var(--terra-bg)', icon: '♛' };
  }
  const a = AGENTS[who];
  return { name: a.name, accent: a.accent, bg: a.accentBg, icon: a.icon };
}

/* ============== SUBCOMPONENTS ============== */

function StatusPill({ status }) {
  const map = {
    active: { label: '진행 중', color: 'var(--sage)', dot: true },
    idle:   { label: '대기',    color: 'var(--ink-faint)', dot: false },
    standby:{ label: '준비됨',  color: 'var(--sage)', dot: true },
  };
  const m = map[status] || map.idle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 500,
      color: m.color,
      padding: '2px 8px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.6)',
      border: '1px solid var(--line-soft)',
      letterSpacing: '0.01em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 99,
        background: m.color,
        boxShadow: m.dot ? `0 0 0 3px ${m.color}22` : 'none',
        animation: m.dot ? 'pulse 2.4s ease-in-out infinite' : 'none',
      }}></span>
      {m.label}
    </span>
  );
}

function AgentNode({ agent, onClick, selected, size = 'md', isMain = false }) {
  const sizes = {
    sm: { card: 180, icon: 44, ring: 60 },
    md: { card: 190, icon: 52, ring: 72 },
    lg: { card: 220, icon: 76, ring: 110 },
  };
  const s = sizes[size];
  return (
    <button
      onClick={onClick}
      data-screen-label={agent.name}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: 6,
        borderRadius: 'var(--radius-lg)',
        transition: 'transform 0.25s ease',
        transform: selected ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Icon orb */}
      <div style={{ position: 'relative' }}>
        {isMain && (
          <div style={{
            position: 'absolute',
            inset: `${-(s.ring-s.icon)/2}px`,
            borderRadius: '50%',
            border: '1px dashed var(--sage)',
            opacity: 0.4,
            animation: 'spin 40s linear infinite',
          }}></div>
        )}
        <div style={{
          width: s.icon, height: s.icon,
          borderRadius: '50%',
          background: agent.accentBg,
          border: `1.5px solid ${agent.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s.icon * 0.45,
          color: agent.accent,
          boxShadow: selected ? `0 0 0 4px ${agent.accent}22, var(--shadow-md)` : 'var(--shadow-sm)',
          transition: 'box-shadow 0.25s ease',
        }}>
          {agent.icon}
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: s.card,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        textAlign: 'center',
        transition: 'box-shadow 0.25s ease',
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}>{agent.name}</div>
        <div style={{
          fontSize: 12,
          color: 'var(--ink-soft)',
          marginTop: 2,
        }}>{agent.role} · <span style={{ color: 'var(--ink-faint)' }}>{agent.sub}</span></div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <StatusPill status={agent.status} />
        </div>
      </div>
    </button>
  );
}

/* SVG connectors from main to satellites */
function Connectors({ positions, animate }) {
  // positions: { main: {x,y}, music: {...}, ... } in % within canvas
  const targets = ['music', 'legal', 'score', 'sns'];
  if (!positions.main) return null;
  return (
    <svg style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 1,
    }}>
      <defs>
        <pattern id="dotpath" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="1" fill="var(--ink-faint)" opacity="0.5"></circle>
        </pattern>
      </defs>
      {targets.map(t => {
        const p = positions[t];
        if (!p) return null;
        const x1 = positions.main.x, y1 = positions.main.y;
        const x2 = p.x, y2 = p.y;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 20;
        return (
          <g key={t}>
            <path
              d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              stroke="var(--ink-faint)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="3 5"
              opacity="0.45"
            />
          </g>
        );
      })}
    </svg>
  );
}

function LogMessage({ entry }) {
  const m = whoMeta(entry.who);
  const isCEO = entry.who === 'ceo';
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      flexDirection: isCEO ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    }}>
      <div style={{
        flexShrink: 0,
        width: 28, height: 28,
        borderRadius: '50%',
        background: m.bg,
        border: `1px solid ${m.accent}`,
        color: m.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>{m.icon}</div>
      <div style={{
        flex: 1,
        background: isCEO ? m.bg : 'var(--paper)',
        border: `1px solid ${isCEO ? m.accent + '55' : 'var(--line)'}`,
        borderRadius: 12,
        padding: '8px 12px',
        maxWidth: '85%',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, marginBottom: 3,
        }}>
          <span style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: m.accent,
            letterSpacing: '-0.01em',
          }}>{m.name}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{entry.t}</span>
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--ink)',
          lineHeight: 1.55,
          textWrap: 'pretty',
        }}>{entry.text}</div>
      </div>
    </div>
  );
}

/* ============== MAIN APP ============== */

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [selectedAgent, setSelectedAgent] = useState('main');
  const [log, setLog] = useState(INITIAL_LOG);
  const [input, setInput] = useState('');
  const [composing, setComposing] = useState(false);
  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Simulate composition response
  function sendCommand(text) {
    if (!text.trim()) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setLog(l => [...l, { who: 'ceo', text, t: ts }]);
    setInput('');
    setComposing(true);
    setTimeout(() => {
      setLog(l => [...l, { who: 'main', text: '확인했습니다. 적합한 에이전트에게 전달하겠습니다.', t: ts }]);
    }, 600);
    setTimeout(() => {
      setLog(l => [...l, { who: 'music', text: '준비됐어요. 곧 결과 공유드릴게요 :)', t: ts }]);
      setComposing(false);
    }, 1400);
  }

  const density = t.density === 'compact' ? 0.92 : 1;

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* ============ TOP HEADER ============ */}
      <header style={{
        padding: '20px 28px 16px 28px',
        borderBottom: '1px solid var(--line-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        background: 'rgba(251, 247, 239, 0.7)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: 'var(--sage-bg)',
            border: '1px solid var(--sage)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sage)',
            fontSize: 18,
          }}>◐</div>
          <div>
            <h1 className={t.headerStyle === 'serif' ? 'serif' : ''} style={{
              margin: 0,
              fontSize: 22,
              fontWeight: t.headerStyle === 'serif' ? 500 : 600,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}>Agent Command Center</h1>
            <div style={{
              fontSize: 12,
              color: 'var(--ink-soft)',
              marginTop: 2,
              letterSpacing: '-0.005em',
            }}>CEO 지휘 본부 · 5 agents online</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '7px 14px',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--ink-soft)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--sage)', animation: 'pulse 2.4s ease-in-out infinite' }}></span>
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>준비됨</span>
            </span>
            <span style={{ color: 'var(--line)' }}>|</span>
            <span className="mono">14:08 KST</span>
          </div>
          <button style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '8px 14px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 500,
            letterSpacing: '-0.005em',
          }}>새 세션 시작</button>
        </div>
      </header>

      {/* ============ BODY ============ */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: 16,
        padding: 16,
        minHeight: 0,
      }}>
        {/* ===== Canvas ===== */}
        <section style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 540,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{
                fontSize: 11,
                color: 'var(--ink-faint)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>topology</span>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>· 에이전트 네트워크</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['network', 'list', 'timeline'].map((v, i) => (
                <button key={v} style={{
                  all: 'unset', cursor: 'pointer',
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: i === 0 ? 'var(--bg-soft)' : 'transparent',
                  color: i === 0 ? 'var(--ink)' : 'var(--ink-faint)',
                  fontWeight: i === 0 ? 500 : 400,
                }}>{v}</button>
              ))}
            </div>
          </div>

          <div className={t.showGrid ? 'canvas-grid' : ''} style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            padding: '32px 24px',
          }}>
            {/* Topology grid: 3x3 with main in center */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              minHeight: 480,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: 'auto 1fr auto',
              gridTemplateAreas: `
                ".     music  .    "
                "legal main   score"
                ".     sns    .    "
              `,
              placeItems: 'center',
              gap: '8px 24px',
            }}>
              {/* Orbit ring under main */}
              {t.showOrbit && (
                <div style={{
                  gridArea: 'main',
                  width: 220, height: 220,
                  borderRadius: '50%',
                  border: '1px dashed var(--sage)',
                  opacity: 0.35,
                  position: 'absolute',
                  alignSelf: 'center',
                  justifySelf: 'center',
                  pointerEvents: 'none',
                }}></div>
              )}

              {/* Connector lines: SVG overlay sized to grid */}
              <svg style={{
                position: 'absolute',
                inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
              }}>
                <defs>
                  <marker id="dot" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4">
                    <circle cx="3" cy="3" r="2" fill="currentColor"></circle>
                  </marker>
                </defs>
                {/* Lines drawn from center to each direction; using % coords */}
                <line x1="50%" y1="50%" x2="50%" y2="14%" stroke="var(--plum)"  strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                <line x1="50%" y1="50%" x2="50%" y2="86%" stroke="var(--rose)"  strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                <line x1="50%" y1="50%" x2="16%" y2="50%" stroke="var(--sand)"  strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                <line x1="50%" y1="50%" x2="84%" y2="50%" stroke="var(--moss)"  strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
              </svg>

              <div style={{ gridArea: 'music', zIndex: 2 }}>
                <AgentNode agent={AGENTS.music} selected={selectedAgent === 'music'} onClick={() => setSelectedAgent('music')} size="md" />
              </div>
              <div style={{ gridArea: 'legal', zIndex: 2 }}>
                <AgentNode agent={AGENTS.legal} selected={selectedAgent === 'legal'} onClick={() => setSelectedAgent('legal')} size="md" />
              </div>
              <div style={{ gridArea: 'main', zIndex: 2 }}>
                <AgentNode agent={AGENTS.main} selected={selectedAgent === 'main'} onClick={() => setSelectedAgent('main')} size="lg" isMain />
              </div>
              <div style={{ gridArea: 'score', zIndex: 2 }}>
                <AgentNode agent={AGENTS.score} selected={selectedAgent === 'score'} onClick={() => setSelectedAgent('score')} size="md" />
              </div>
              <div style={{ gridArea: 'sns', zIndex: 2 }}>
                <AgentNode agent={AGENTS.sns} selected={selectedAgent === 'sns'} onClick={() => setSelectedAgent('sns')} size="md" />
              </div>
            </div>
          </div>

          {/* Selected agent footer detail */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line-soft)',
            background: 'var(--bg-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            minHeight: 56,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: AGENTS[selectedAgent].accentBg,
              border: `1px solid ${AGENTS[selectedAgent].accent}`,
              color: AGENTS[selectedAgent].accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>{AGENTS[selectedAgent].icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {AGENTS[selectedAgent].name}
                <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>· {AGENTS[selectedAgent].role}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>
                {AGENTS[selectedAgent].desc}
              </div>
            </div>
            <button style={{
              all: 'unset', cursor: 'pointer',
              padding: '6px 12px',
              fontSize: 12,
              border: '1px solid var(--line)',
              borderRadius: 999,
              background: 'var(--paper)',
              color: 'var(--ink-soft)',
            }}>상세 →</button>
          </div>
        </section>

        {/* ===== Log Sidebar ===== */}
        <aside style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 540,
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Command Log
              </span>
              <span className="mono" style={{
                fontSize: 10,
                color: 'var(--ink-faint)',
                background: 'var(--bg-soft)',
                padding: '2px 7px',
                borderRadius: 99,
                letterSpacing: '0.04em',
              }}>{log.length} msgs</span>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--terra)',
              fontWeight: 500,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99, background: 'var(--terra)',
                animation: 'pulse 2.4s ease-in-out infinite',
              }}></span>
              live
            </span>
          </div>

          <div ref={logRef} style={{
            flex: 1,
            padding: '14px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--bg-soft)',
          }}>
            {log.map((e, i) => <LogMessage key={i} entry={e} />)}
            {composing && (
              <div style={{
                fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic',
                paddingLeft: 38,
              }}>에이전트가 응답을 작성중이에요…</div>
            )}
          </div>
        </aside>
      </div>

      {/* ============ COMMAND INPUT ============ */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
          }}>
            <div style={{
              flexShrink: 0,
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--terra-bg)',
              border: '1px solid var(--terra)',
              color: 'var(--terra)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
            }}>♛</div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendCommand(input);
                }
              }}
              placeholder="에이전트에게 명령을 내려보세요. (Enter: 전송, Shift+Enter: 줄바꿈)"
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 14,
                color: 'var(--ink)',
                lineHeight: 1.6,
                padding: '6px 0',
              }}
            />
            <button
              onClick={() => sendCommand(input)}
              disabled={!input.trim()}
              style={{
                all: 'unset',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                padding: '8px 16px',
                borderRadius: 999,
                background: input.trim() ? 'var(--ink)' : 'var(--bg-soft)',
                color: input.trim() ? 'var(--paper)' : 'var(--ink-faint)',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              전송 <span style={{ fontSize: 11 }}>↵</span>
            </button>
          </div>

          <div style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px dashed var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.04em',
            }} className="mono">QUICK</span>
            {QUICK_COMMANDS.map(cmd => (
              <button
                key={cmd}
                onClick={() => sendCommand(cmd)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '5px 11px',
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  background: 'var(--bg-soft)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
              >{cmd}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ============ TWEAKS ============ */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette">
          <TweakRadio
            label="Tone"
            value={t.palette}
            onChange={v => setTweak('palette', v)}
            options={[
              { value: 'paper', label: 'Paper' },
              { value: 'mist',  label: 'Mist' },
              { value: 'dusk',  label: 'Dusk' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle
            label="배경 도트 그리드"
            value={t.showGrid}
            onChange={v => setTweak('showGrid', v)}
          />
          <TweakToggle
            label="메인 에이전트 궤도"
            value={t.showOrbit}
            onChange={v => setTweak('showOrbit', v)}
          />
          <TweakRadio
            label="타이틀 스타일"
            value={t.headerStyle}
            onChange={v => setTweak('headerStyle', v)}
            options={[
              { value: 'sans',   label: 'Sans' },
              { value: 'serif',  label: 'Serif' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>

      {/* Palette overrides */}
      <style>{`
        ${t.palette === 'mist' ? `
          :root {
            --bg: #eef1f3;
            --bg-soft: #e4e8ec;
            --paper: #f7f9fb;
            --line: #d8dde2;
            --line-soft: #e3e8ec;
            --sage: oklch(0.62 0.06 220);
            --sage-bg: oklch(0.94 0.025 220);
          }
        ` : ''}
        ${t.palette === 'dusk' ? `
          :root {
            --bg: #2a2823;
            --bg-soft: #34322c;
            --paper: #3a3832;
            --ink: #f0ebe0;
            --ink-soft: #c4bdaf;
            --ink-faint: #8a8378;
            --line: #4a473f;
            --line-soft: #3f3d35;
            --sage: oklch(0.78 0.08 145);
            --sage-bg: oklch(0.32 0.05 145);
            --terra: oklch(0.75 0.10 45);
            --terra-bg: oklch(0.32 0.06 45);
            --plum: oklch(0.72 0.09 320);
            --plum-bg: oklch(0.32 0.05 320);
            --sand: oklch(0.78 0.10 75);
            --sand-bg: oklch(0.32 0.06 80);
            --moss: oklch(0.74 0.09 165);
            --moss-bg: oklch(0.32 0.05 165);
            --rose: oklch(0.74 0.10 15);
            --rose-bg: oklch(0.32 0.06 20);
          }
          body { background: var(--bg); }
        ` : ''}
      `}</style>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea::placeholder { color: var(--ink-faint); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
