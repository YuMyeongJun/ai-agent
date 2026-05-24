import { useCallback, useState } from 'react'

export const TWEAK_DEFAULTS = {
  palette: 'paper',
  showGrid: true,
  showOrbit: true,
  headerStyle: 'serif',
}

const STORAGE_KEY = 'agent-command-center-tweaks'

function loadTweaks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...TWEAK_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return TWEAK_DEFAULTS
}

export function useTweaks() {
  const [tweaks, setTweaksState] = useState(loadTweaks)

  const setTweak = useCallback((key, value) => {
    setTweaksState((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [tweaks, setTweak]
}
