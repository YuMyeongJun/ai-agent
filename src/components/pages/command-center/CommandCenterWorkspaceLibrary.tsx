import { useEffect, useState } from 'react'
import { fetchLibrary } from '../../../hooks/client/missionQuery'
import type { ILibrarySession } from '../../../models/interface/res/ILibraryRes'

export interface ICommandCenterWorkspaceLibraryProps {
  value: string | null
  onChange?: (sessionId: string) => void
  refreshKey?: number
}

export const CommandCenterWorkspaceLibrary = ({
  value,
  onChange,
  refreshKey = 0,
}: ICommandCenterWorkspaceLibraryProps) => {
  const [sessions, setSessions] = useState<ILibrarySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchLibrary()
      .then((data) => {
        if (!cancelled) setSessions(data.sessions ?? [])
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    if (!loading && sessions.length > 0 && !value) {
      onChange?.(sessions[0].sessionId)
    }
  }, [loading, sessions, value, onChange])

  if (loading) {
    return (
      <div className="workspace-library">
        <span className="workspace-library__label mono">저장된 작업</span>
        <span className="workspace-library__status">불러오는 중…</span>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="workspace-library">
        <span className="workspace-library__label mono">저장된 작업</span>
        <span className="workspace-library__status">아직 없음 — 미션을 실행해 주세요</span>
      </div>
    )
  }

  return (
    <div className="workspace-library">
      <label className="workspace-library__label mono" htmlFor="workspace-library-select">
        저장된 작업
      </label>
      <select
        id="workspace-library-select"
        className="workspace-library__select"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {sessions.map((session) => (
          <option key={session.sessionId} value={session.sessionId}>
            {session.title.slice(0, 48)}
            {session.title.length > 48 ? '…' : ''}
            {' · '}
            {session.sessionId.slice(0, 6)}
            {session.artifactCount ? ` · ${session.artifactCount} files` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
