export const TILE_SIZE = 32

export const MAP_COLS = 40
export const MAP_ROWS = 24

export type TileKind = 'floor' | 'carpet' | 'wood' | 'wall' | 'grass' | 'water'

export interface IZone {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

export interface IDesk {
  id: string
  label: string
  x: number
  y: number
  zoneId: string
}

export const OFFICE_ZONES: IZone[] = [
  { id: 'open', label: '오픈 워크스페이스', x: 2, y: 2, w: 18, h: 10, color: '#e8dcc8' },
  { id: 'meeting', label: '회의실', x: 22, y: 2, w: 10, h: 8, color: '#d4e4f4' },
  { id: 'lab', label: 'LAB', x: 34, y: 2, w: 4, h: 8, color: '#dce8dc' },
  { id: 'lounge', label: '라운지', x: 2, y: 14, w: 12, h: 8, color: '#f0e0d0' },
  { id: 'plaza', label: '소통마당', x: 16, y: 14, w: 14, h: 8, color: '#e0e8f0' },
  { id: 'ceo', label: 'CEO 존', x: 32, y: 14, w: 6, h: 8, color: '#f4e8c8' },
]

export const OFFICE_DESKS: IDesk[] = [
  { id: 'desk-dev-1', label: 'Dev A', x: 4, y: 5, zoneId: 'open' },
  { id: 'desk-dev-2', label: 'Dev B', x: 8, y: 5, zoneId: 'open' },
  { id: 'desk-research-1', label: 'Research', x: 12, y: 5, zoneId: 'open' },
  { id: 'desk-writer-1', label: 'Writer', x: 4, y: 8, zoneId: 'open' },
  { id: 'desk-analyst-1', label: 'Analyst', x: 8, y: 8, zoneId: 'open' },
  { id: 'desk-meeting-1', label: 'Meeting 1', x: 24, y: 5, zoneId: 'meeting' },
  { id: 'desk-meeting-2', label: 'Meeting 2', x: 28, y: 5, zoneId: 'meeting' },
  { id: 'desk-lab-1', label: 'LAB 1', x: 35, y: 5, zoneId: 'lab' },
  { id: 'desk-lounge-1', label: 'Lounge', x: 6, y: 17, zoneId: 'lounge' },
  { id: 'desk-plaza-1', label: 'Plaza A', x: 18, y: 17, zoneId: 'plaza' },
  { id: 'desk-plaza-2', label: 'Plaza B', x: 22, y: 17, zoneId: 'plaza' },
  { id: 'desk-ceo', label: 'CEO Desk', x: 34, y: 17, zoneId: 'ceo' },
]

export function buildTileMap(): TileKind[][] {
  const map: TileKind[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'floor' as TileKind),
  )

  for (const zone of OFFICE_ZONES) {
    const kind: TileKind =
      zone.id === 'lounge' ? 'wood' : zone.id === 'plaza' ? 'carpet' : 'floor'
    for (let y = zone.y; y < zone.y + zone.h && y < MAP_ROWS; y++) {
      for (let x = zone.x; x < zone.x + zone.w && x < MAP_COLS; x++) {
        map[y][x] = kind
      }
    }
  }

  for (let x = 0; x < MAP_COLS; x++) {
    map[0][x] = 'wall'
    map[MAP_ROWS - 1][x] = 'wall'
  }
  for (let y = 0; y < MAP_ROWS; y++) {
    map[y][0] = 'wall'
    map[y][MAP_COLS - 1] = 'wall'
  }

  return map
}

export function getDeskById(deskId: string): IDesk | undefined {
  return OFFICE_DESKS.find((desk) => desk.id === deskId)
}

export function getFreeDesks(occupiedDeskIds: string[]): IDesk[] {
  return OFFICE_DESKS.filter((desk) => !occupiedDeskIds.includes(desk.id))
}

export interface IMoveTarget {
  x: number
  y: number
  zoneId?: string
  reason?: string
}

const ZONE_CENTERS: Record<string, { x: number; y: number }> = {
  meeting: { x: 26.5, y: 6.0 },
  plaza: { x: 20.0, y: 17.5 },
  lab: { x: 35.5, y: 5.5 },
  open: { x: 8.0, y: 6.5 },
  lounge: { x: 8.0, y: 17.5 },
  ceo: { x: 34.5, y: 17.5 },
}

export function deskToPosition(deskId: string): { x: number; y: number } | null {
  const desk = getDeskById(deskId)
  if (!desk) return null
  return { x: desk.x + 0.5, y: desk.y + 0.3 }
}

export function resolveMoveTarget(input: {
  x?: number
  y?: number
  zoneId?: string
  deskId?: string
}): IMoveTarget {
  if (input.x != null && input.y != null) {
    return { x: input.x, y: input.y, zoneId: input.zoneId, reason: undefined }
  }
  if (input.deskId) {
    const pos = deskToPosition(input.deskId)
    if (pos) return { ...pos, zoneId: input.zoneId }
  }
  if (input.zoneId && ZONE_CENTERS[input.zoneId]) {
    return { ...ZONE_CENTERS[input.zoneId], zoneId: input.zoneId }
  }
  return { x: 26.5, y: 6.0, zoneId: 'meeting' }
}
