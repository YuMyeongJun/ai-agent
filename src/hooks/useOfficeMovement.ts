import { useCallback, useEffect, useState } from 'react'
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from '../office/officeMap'

export interface IPosition {
  x: number
  y: number
}

const PLAYER_SPEED = 4

export function useOfficeMovement(initial: IPosition = { x: 34, y: 17 }) {
  const [playerPos, setPlayerPos] = useState<IPosition>(initial)
  const [keys, setKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault()
        setKeys((prev) => new Set(prev).add(e.key.toLowerCase()))
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const next = new Set(prev)
        next.delete(e.key.toLowerCase())
        return next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (keys.size === 0) return undefined

    const interval = setInterval(() => {
      setPlayerPos((pos) => {
        let { x, y } = pos
        if (keys.has('arrowup') || keys.has('w')) y -= PLAYER_SPEED / TILE_SIZE
        if (keys.has('arrowdown') || keys.has('s')) y += PLAYER_SPEED / TILE_SIZE
        if (keys.has('arrowleft') || keys.has('a')) x -= PLAYER_SPEED / TILE_SIZE
        if (keys.has('arrowright') || keys.has('d')) x += PLAYER_SPEED / TILE_SIZE

        x = Math.max(1, Math.min(MAP_COLS - 2, x))
        y = Math.max(1, Math.min(MAP_ROWS - 2, y))
        return { x, y }
      })
    }, 16)

    return () => clearInterval(interval)
  }, [keys])

  const moveTo = useCallback((target: IPosition) => {
    setPlayerPos({
      x: Math.max(1, Math.min(MAP_COLS - 2, target.x)),
      y: Math.max(1, Math.min(MAP_ROWS - 2, target.y)),
    })
  }, [])

  return { playerPos, moveTo }
}
