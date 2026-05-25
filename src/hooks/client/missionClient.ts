import type { IMissionEventRes } from '../../models/interface/res/IMissionEventRes'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function* streamChat(
  message: string,
  options: {
    sessionId?: string | null
    employeeIds?: string[]
    forceMission?: boolean
  } = {},
): AsyncGenerator<IMissionEventRes> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: options.sessionId ?? undefined,
      employeeIds: options.employeeIds,
      forceMission: options.forceMission ?? false,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Chat failed (${response.status})`)
  }

  yield* readSseStream(response)
}

export async function* streamMission(
  command: string,
  employeeIds?: string[],
): AsyncGenerator<IMissionEventRes> {
  const response = await fetch(`${API_BASE}/api/mission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, employeeIds }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Mission failed (${response.status})`)
  }

  yield* readSseStream(response)
}

async function* readSseStream(response: Response): AsyncGenerator<IMissionEventRes> {
  const reader = response.body!.getReader()
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
        yield JSON.parse(line.slice(6)) as IMissionEventRes
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
      yield JSON.parse(line.slice(6)) as IMissionEventRes
    }
  }
}

export async function checkHealth(): Promise<{ status?: string; employees?: number }> {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) throw new Error('Backend unavailable')
  return response.json()
}

export function artifactFullUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export function sessionArtifactUrl(sessionId: string, filename: string): string {
  return `/api/workspace/${sessionId}/${filename}`
}

export interface IChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function fetchChatHistory(sessionId: string): Promise<IChatHistoryMessage[]> {
  const response = await fetch(`${API_BASE}/api/chat/${sessionId}/history`)
  if (!response.ok) return []
  const data = await response.json()
  return data.messages ?? []
}

export interface ITaskArtifact {
  filename: string
  title: string
  kind: string
  url: string
  agentId?: string
  size?: number
  contentPreview?: string
}

export async function fetchTaskArtifacts(sessionId: string): Promise<{
  sessionId: string
  mission?: string
  status?: string
  artifacts: ITaskArtifact[]
}> {
  const response = await fetch(`${API_BASE}/api/tasks/${sessionId}/artifacts`)
  if (!response.ok) {
    return { sessionId, artifacts: [] }
  }
  return response.json()
}
