import { useEffect, useMemo, useState } from 'react'
import type { IEmployee } from '../models/types/employeeType'
import { deskToPosition, type IMoveTarget } from '../office/officeMap'

const LERP = 0.14

export function useOfficePresence(
  employees: IEmployee[],
  moveTargets: Record<string, IMoveTarget>,
) {
  const homePositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {}
    employees.forEach((emp) => {
      const pos = emp.deskId ? deskToPosition(emp.deskId) : null
      if (pos) map[emp.id] = pos
    })
    return map
  }, [employees])

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(homePositions)

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev }
      for (const [id, home] of Object.entries(homePositions)) {
        if (!next[id]) next[id] = { ...home }
      }
      return next
    })
  }, [homePositions])

  useEffect(() => {
    const tick = () => {
      setPositions((prev) => {
        let changed = false
        const next = { ...prev }
        for (const emp of employees) {
          const target = moveTargets[emp.id] ?? homePositions[emp.id]
          if (!target) continue
          const cur = next[emp.id] ?? target
          const dx = target.x - cur.x
          const dy = target.y - cur.y
          if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
            changed = true
            next[emp.id] = { x: cur.x + dx * LERP, y: cur.y + dy * LERP }
          } else {
            next[emp.id] = { x: target.x, y: target.y }
          }
        }
        return changed ? next : prev
      })
    }
    const id = window.setInterval(tick, 32)
    return () => window.clearInterval(id)
  }, [employees, moveTargets, homePositions])

  return positions
}
