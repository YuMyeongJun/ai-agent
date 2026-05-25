import { useCallback, useEffect, useState } from 'react'
import type { IEmployee } from '../models/types/employeeType'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export function useEmployees() {
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/employees`)
      if (!response.ok) throw new Error('직원 목록을 불러올 수 없습니다.')
      const data = await response.json()
      setEmployees(data.employees ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createEmployee = useCallback(
    async (payload: Omit<IEmployee, 'id'> & { id?: string }) => {
      const response = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('직원 생성에 실패했습니다.')
      const created = await response.json()
      setEmployees((prev) => [...prev, created])
      return created as IEmployee
    },
    [],
  )

  const updateEmployee = useCallback(async (id: string, payload: Partial<IEmployee>) => {
    const response = await fetch(`${API_BASE}/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error('직원 수정에 실패했습니다.')
    const updated = await response.json()
    setEmployees((prev) => prev.map((emp) => (emp.id === id ? updated : emp)))
    return updated as IEmployee
  }, [])

  const removeEmployee = useCallback(async (id: string) => {
    const response = await fetch(`${API_BASE}/api/employees/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('직원 삭제에 실패했습니다.')
    setEmployees((prev) => prev.filter((emp) => emp.id !== id))
  }, [])

  return {
    employees,
    activeEmployees: employees.filter((emp) => emp.active),
    loading,
    error,
    refresh,
    createEmployee,
    updateEmployee,
    removeEmployee,
  }
}
