import { useCallback, useState } from 'react'

export interface ITweaks {
  palette: 'paper' | 'mist' | 'dusk'
  showGrid: boolean
  showOrbit: boolean
  headerStyle: 'sans' | 'serif'
}

export const TWEAK_DEFAULTS: ITweaks = {
  palette: 'paper',
  showGrid: true,
  showOrbit: true,
  headerStyle: 'serif',
}

const STORAGE_KEY = 'agent-command-center-tweaks'

function loadTweaks(): ITweaks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...TWEAK_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return TWEAK_DEFAULTS
}

export function useTweaks(): [ITweaks, (key: keyof ITweaks, value: ITweaks[keyof ITweaks]) => void] {
  const [tweaks, setTweaksState] = useState(loadTweaks)

  const setTweak = useCallback((key: keyof ITweaks, value: ITweaks[keyof ITweaks]) => {
    setTweaksState((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [tweaks, setTweak]
}
