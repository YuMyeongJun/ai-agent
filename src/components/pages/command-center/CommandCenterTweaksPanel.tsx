import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ITweaks } from '../../../hooks/useTweaks'

interface ITweakSectionProps {
  label: string
  children: ReactNode
}

const TweakSection = ({ label, children }: ITweakSectionProps) => {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  )
}

interface ITweakRowProps {
  label?: string
  value?: string | number
  children: ReactNode
  inline?: boolean
}

const TweakRow = ({ label, value, children, inline = false }: ITweakRowProps) => {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      {(label || value != null) && (
        <div className="twk-lbl">
          {label && <span>{label}</span>}
          {value != null && <span className="twk-val">{value}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

interface ITweakToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

const TweakToggle = ({ label, value, onChange }: ITweakToggleProps) => {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? '1' : '0'}
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  )
}

interface ITweakRadioOption {
  value: string
  label: string
}

interface ITweakRadioProps {
  label: string
  value: string
  options: (string | ITweakRadioOption)[]
  onChange: (value: string) => void
}

const TweakRadio = ({ label, value, options, onChange }: ITweakRadioProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value

  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))
  const idx = Math.max(0, opts.findIndex((o) => o.value === value))
  const n = opts.length

  const segAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect()
    const inner = r.width - 4
    const i = Math.floor(((clientX - r.left - 2) / inner) * n)
    return opts[Math.max(0, Math.min(n - 1, i))].value
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    const v0 = segAt(e.clientX)
    if (v0 !== valueRef.current) onChange(v0)
    const move = (ev: PointerEvent) => {
      if (!trackRef.current) return
      const v = segAt(ev.clientX)
      if (v !== valueRef.current) onChange(v)
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <TweakRow label={label}>
      <div
        ref={trackRef}
        role="radiogroup"
        onPointerDown={onPointerDown}
        className={dragging ? 'twk-seg dragging' : 'twk-seg'}
      >
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  )
}

export interface ICommandCenterTweaksPanelProps {
  tweaks: ITweaks
  setTweak: (key: keyof ITweaks, value: ITweaks[keyof ITweaks]) => void
  open: boolean
  onClose: () => void
}

export const CommandCenterTweaksPanel = ({
  tweaks,
  setTweak,
  open,
  onClose,
}: ICommandCenterTweaksPanelProps) => {
  const dragRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 16, y: 16 })
  const PAD = 16

  const clampToViewport = () => {
    const panel = dragRef.current
    if (!panel) return
    const w = panel.offsetWidth
    const h = panel.offsetHeight
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD)
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD)
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    }
    panel.style.right = `${offsetRef.current.x}px`
    panel.style.bottom = `${offsetRef.current.y}px`
  }

  useEffect(() => {
    if (!open) return undefined
    clampToViewport()
    window.addEventListener('resize', clampToViewport)
    return () => window.removeEventListener('resize', clampToViewport)
  }, [open])

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current
    if (!panel) return
    const r = panel.getBoundingClientRect()
    const sx = e.clientX
    const sy = e.clientY
    const startRight = window.innerWidth - r.right
    const startBottom = window.innerHeight - r.bottom
    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      }
      clampToViewport()
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  if (!open) return null

  return (
    <div
      ref={dragRef}
      className="twk-panel"
      style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
    >
      <div className="twk-hd" onMouseDown={onDragStart}>
        <b>Tweaks</b>
        <button type="button" className="twk-x" aria-label="Close tweaks" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="twk-body">
        <TweakSection label="Palette">
          <TweakRadio
            label="Tone"
            value={tweaks.palette}
            onChange={(v) => setTweak('palette', v as ITweaks['palette'])}
            options={[
              { value: 'paper', label: 'Paper' },
              { value: 'mist', label: 'Mist' },
              { value: 'dusk', label: 'Dusk' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle
            label="배경 도트 그리드"
            value={tweaks.showGrid}
            onChange={(v) => setTweak('showGrid', v)}
          />
          <TweakToggle
            label="메인 에이전트 궤도"
            value={tweaks.showOrbit}
            onChange={(v) => setTweak('showOrbit', v)}
          />
          <TweakRadio
            label="타이틀 스타일"
            value={tweaks.headerStyle}
            onChange={(v) => setTweak('headerStyle', v as ITweaks['headerStyle'])}
            options={[
              { value: 'sans', label: 'Sans' },
              { value: 'serif', label: 'Serif' },
            ]}
          />
        </TweakSection>
      </div>
    </div>
  )
}

export interface ITweaksFabProps {
  onClick: () => void
}

export const TweaksFab = ({ onClick }: ITweaksFabProps) => {
  return (
    <button type="button" className="tweaks-fab" onClick={onClick} aria-label="Open tweaks">
      ◑
    </button>
  )
}
