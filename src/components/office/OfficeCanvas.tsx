import { useMemo } from 'react'
import type { AgentStatus } from '../../models/types/employeeType'
import type { IEmployee } from '../../models/types/employeeType'
import {
  buildTileMap,
  MAP_COLS,
  MAP_ROWS,
  OFFICE_DESKS,
  OFFICE_ZONES,
  TILE_SIZE,
} from '../../office/officeMap'

export interface IOfficeCanvasProps {
  employees: IEmployee[]
  agentStatuses: Record<string, AgentStatus>
  employeePositions: Record<string, { x: number; y: number }>
  speechBubbles: Record<string, string>
  playerPos: { x: number; y: number }
  selectedEmployeeId: string | null
  onSelectEmployee: (id: string) => void
  onSelectDesk: (deskId: string) => void
}

const TILE_COLORS: Record<string, string> = {
  floor: '#f0ebe0',
  carpet: '#d8dce8',
  wood: '#d4c4a8',
  wall: '#8a8278',
  grass: '#b8d4a8',
}

export const OfficeCanvas = ({
  employees,
  agentStatuses,
  employeePositions,
  speechBubbles,
  playerPos,
  selectedEmployeeId,
  onSelectEmployee,
  onSelectDesk,
}: IOfficeCanvasProps) => {
  const tileMap = useMemo(() => buildTileMap(), [])

  const mapWidth = MAP_COLS * TILE_SIZE
  const mapHeight = MAP_ROWS * TILE_SIZE

  return (
    <div className="office-canvas-wrap">
      <div
        className="office-canvas"
        style={{ width: mapWidth, height: mapHeight }}
      >
        {tileMap.map((row, y) =>
          row.map((tile, x) => (
            <div
              key={`${x}-${y}`}
              className="office-tile"
              style={{
                left: x * TILE_SIZE,
                top: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                background: TILE_COLORS[tile] ?? TILE_COLORS.floor,
              }}
            />
          )),
        )}

        {OFFICE_ZONES.map((zone) => (
          <div
            key={zone.id}
            className="office-zone-label"
            style={{
              left: zone.x * TILE_SIZE + 8,
              top: zone.y * TILE_SIZE + 6,
            }}
          >
            {zone.label}
          </div>
        ))}

        {OFFICE_DESKS.map((desk) => (
          <button
            key={desk.id}
            type="button"
            className="office-desk"
            style={{
              left: desk.x * TILE_SIZE,
              top: desk.y * TILE_SIZE,
            }}
            onClick={() => onSelectDesk(desk.id)}
            title={desk.label}
          >
            <span className="office-desk__surface" />
            <span className="office-desk__label">{desk.label}</span>
          </button>
        ))}

        {employees.map((emp) => {
          const pos = employeePositions[emp.id]
          if (!pos) return null
          const status = agentStatuses[emp.id] ?? 'IDLE'
          const isSelected = selectedEmployeeId === emp.id
          const bubble = speechBubbles[emp.id]
          return (
            <button
              key={emp.id}
              type="button"
              className={`office-avatar ${isSelected ? 'office-avatar--selected' : ''} office-avatar--${status.toLowerCase()}`}
              style={{
                left: pos.x * TILE_SIZE - 14,
                top: pos.y * TILE_SIZE - 28,
                transition: 'left 0.05s linear, top 0.05s linear',
                '--emp-color': emp.color,
              } as React.CSSProperties}
              onClick={() => onSelectEmployee(emp.id)}
              title={`${emp.name} · ${emp.role}`}
            >
              {bubble && (
                <span className="office-avatar__bubble">{bubble}</span>
              )}
              <span className="office-avatar__sprite">{emp.emoji}</span>
              <span className="office-avatar__name">{emp.name}</span>
              {status !== 'IDLE' && <span className="office-avatar__status-dot" />}
            </button>
          )
        })}

        {speechBubbles.main && (
          <div
            className="office-avatar__bubble office-avatar__bubble--main"
            style={{
              left: 26.5 * TILE_SIZE - 60,
              top: 4.8 * TILE_SIZE - 36,
            }}
          >
            {speechBubbles.main}
          </div>
        )}

        <div
          className="office-avatar office-avatar--player"
          style={{
            left: playerPos.x * TILE_SIZE - 14,
            top: playerPos.y * TILE_SIZE - 28,
          }}
          title="CEO (You)"
        >
          <span className="office-avatar__sprite">♛</span>
          <span className="office-avatar__name">CEO</span>
        </div>
      </div>

      <div className="office-hint mono">
        WASD 이동 · 대화로 아이디어 논의 · &quot;기획해줘&quot;처럼 말하면 팀이 회의실에서 작업 시작
      </div>
    </div>
  )
}
