import { useEffect, useState } from 'react'
import { checkHealth } from '../../../hooks/client/missionClient'

export const CommandCenterBackendStatus = () => {
  const [online, setOnline] = useState(true)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        await checkHealth()
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    ping()
    const id = setInterval(ping, 15_000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (checking || online) return null

  return (
    <div className="backend-status" role="status">
      <strong>백엔드 연결 안 됨</strong>
      <span>별도 터미널에서 `npm run dev:backend` 실행 후 새로고침하세요.</span>
    </div>
  )
}
