const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function* streamMission(command) {
  const response = await fetch(`${API_BASE}/api/mission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Mission failed (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part
        .split('\n')
        .find((entry) => entry.startsWith('data: '))
      if (!line) continue
      try {
        yield JSON.parse(line.slice(6))
      } catch {
        // ignore malformed chunks
      }
    }
  }

  if (buffer.trim()) {
    const line = buffer
      .split('\n')
      .find((entry) => entry.startsWith('data: '))
    if (line) {
      yield JSON.parse(line.slice(6))
    }
  }
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) throw new Error('Backend unavailable')
  return response.json()
}

export function artifactFullUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}
