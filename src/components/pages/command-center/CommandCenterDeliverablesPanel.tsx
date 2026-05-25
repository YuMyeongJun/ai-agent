import { useEffect, useMemo, useState } from 'react'
import { artifactFullUrl } from '../../../hooks/client/missionClient'
import type { ITaskArtifact } from '../../../hooks/client/missionClient'
import type { IArtifact } from '../../../models/interface/res/IMissionEventRes'

function mergeArtifacts(
  taskArtifacts: ITaskArtifact[],
  sessionArtifacts: IArtifact[],
): IArtifact[] {
  const map = new Map<string, IArtifact>()

  for (const item of sessionArtifacts) {
    map.set(item.filename, item)
  }
  for (const item of taskArtifacts) {
    map.set(item.filename, {
      filename: item.filename,
      title: item.title,
      kind: item.kind,
      url: item.url,
      agentId: item.agentId,
      preview: item.contentPreview,
    })
  }

  return Array.from(map.values())
}

const KIND_ICONS: Record<string, string> = {
  markdown: '📝',
  code: '💻',
  json: '📋',
  text: '📄',
  pdf: '📕',
  pptx: '📊',
  html: '🌐',
  svg: '🖼️',
  figma: '🎨',
  'claude-design': '✨',
  image: '🖼️',
  file: '📁',
}

const TEXT_KINDS = ['markdown', 'code', 'text', 'json', 'html', 'svg', 'figma', 'claude-design']
const PREVIEW_KINDS = ['markdown', 'code', 'text', 'json', 'html', 'svg', 'pdf', 'figma', 'claude-design', 'image']

interface IFigmaLinkPayload {
  status?: string
  fileUrl?: string
  fileName?: string
  importJsonUrl?: string
  message?: string
  instructions?: string[]
  figmaUser?: string
}

interface IClaudeDesignLinkPayload {
  status?: string
  mission?: string
  claudeDesignUrl?: string
  designPrompt?: string
  htmlUrl?: string
  handoffUrl?: string
  instructions?: string[]
  hasClaudeApi?: boolean
}

export interface ICommandCenterDeliverablesPanelProps {
  sessionId: string | null
  missionTitle?: string | null
  taskArtifacts: ITaskArtifact[]
  sessionArtifacts: IArtifact[]
  onViewArtifact: (artifact: IArtifact) => void
}

export const CommandCenterDeliverablesPanel = ({
  sessionId,
  missionTitle,
  taskArtifacts,
  sessionArtifacts,
  onViewArtifact,
}: ICommandCenterDeliverablesPanelProps) => {
  const artifacts = useMemo(
    () => mergeArtifacts(taskArtifacts, sessionArtifacts),
    [taskArtifacts, sessionArtifacts],
  )
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  const selected = artifacts.find((a) => a.filename === selectedFilename) ?? null

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedFilename(null)
      return
    }
    if (!selectedFilename || !artifacts.some((a) => a.filename === selectedFilename)) {
      setSelectedFilename(artifacts[0].filename)
    }
  }, [artifacts, selectedFilename])

  useEffect(() => {
    if (!selected || !TEXT_KINDS.includes(selected.kind)) {
      setPreviewText('')
      return undefined
    }

    const inline = selected.preview
    if (inline) {
      setPreviewText(inline)
      setLoadingPreview(false)
      return undefined
    }

    let cancelled = false
    setLoadingPreview(true)
    fetch(artifactFullUrl(selected.url))
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.text()
      })
      .then((body) => {
        if (!cancelled) setPreviewText(body)
      })
      .catch(() => {
        if (!cancelled) setPreviewText('파일을 불러올 수 없습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  const previewUrl = selected?.url ? artifactFullUrl(selected.url) : ''

  const figmaPayload: IFigmaLinkPayload | null = useMemo(() => {
    if (selected?.kind !== 'figma' || !previewText) return null
    try {
      return JSON.parse(previewText) as IFigmaLinkPayload
    } catch {
      return null
    }
  }, [selected?.kind, previewText])

  const claudeDesignPayload: IClaudeDesignLinkPayload | null = useMemo(() => {
    if (selected?.kind !== 'claude-design' || !previewText || !selected.filename.endsWith('_link.json')) {
      return null
    }
    try {
      return JSON.parse(previewText) as IClaudeDesignLinkPayload
    } catch {
      return null
    }
  }, [selected, previewText])

  const copyDesignPrompt = () => {
    const prompt = claudeDesignPayload?.designPrompt
    if (prompt) void navigator.clipboard.writeText(prompt)
  }

  const handleSelect = (artifact: IArtifact) => {
    if (selectedFilename === artifact.filename) {
      setSelectedFilename(null)
      return
    }
    setSelectedFilename(artifact.filename)
  }

  return (
    <div className="deliverables-panel">
      <div className="deliverables-panel__header">
        <div>
          <h3>산출물</h3>
          {missionTitle && <p className="deliverables-panel__mission">{missionTitle}</p>}
          {sessionId && (
            <span className="mono deliverables-panel__session">#{sessionId}</span>
          )}
        </div>
        <span className="mono deliverables-panel__count">{artifacts.length} files</span>
      </div>

      <div className="deliverables-panel__body">
        {artifacts.length === 0 ? (
          <p className="deliverables-panel__empty">
            미션 완료 후 workspace에 생성된 파일이 여기에 표시됩니다.
          </p>
        ) : (
          <>
            <ul className="deliverables-panel__list">
              {artifacts.map((artifact) => (
                <li key={artifact.filename}>
                  <button
                    type="button"
                    className={`deliverables-panel__item ${selectedFilename === artifact.filename ? 'deliverables-panel__item--active' : ''}`}
                    onClick={() => handleSelect(artifact)}
                  >
                    <span className="deliverables-panel__icon">
                      {KIND_ICONS[artifact.kind] ?? '📁'}
                    </span>
                    <span className="deliverables-panel__meta">
                      <strong>{artifact.title ?? artifact.filename}</strong>
                      <small>{artifact.filename}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selected && PREVIEW_KINDS.includes(selected.kind) && (
              <div className="deliverables-panel__preview">
                <div className="deliverables-panel__preview-header">
                  <span>{selected.filename}</span>
                  <div className="deliverables-panel__preview-actions">
                    {(selected.kind === 'markdown' || selected.kind === 'code') && (
                      <button
                        type="button"
                        className="deliverables-panel__open"
                        onClick={() => onViewArtifact(selected)}
                      >
                        전체화면
                      </button>
                    )}
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="deliverables-panel__open"
                      download={selected.kind === 'pptx' || selected.kind === 'pdf' ? selected.filename : undefined}
                    >
                      {selected.kind === 'pptx' ? '다운로드' : '새 탭'}
                    </a>
                  </div>
                </div>
                {selected.kind === 'pdf' && (
                  <iframe
                    className="deliverables-panel__preview-frame"
                    src={previewUrl}
                    title={selected.filename}
                  />
                )}
                {selected.kind === 'html' && (
                  <iframe
                    className="deliverables-panel__preview-frame"
                    src={previewUrl}
                    title={selected.filename}
                    sandbox="allow-same-origin"
                  />
                )}
                {selected.kind === 'claude-design' && selected.filename.endsWith('.html') && (
                  <iframe
                    className="deliverables-panel__preview-frame"
                    src={previewUrl}
                    title={selected.filename}
                    sandbox="allow-same-origin"
                  />
                )}
                {selected.kind === 'svg' && (
                  <div
                    className="deliverables-panel__preview-svg"
                    dangerouslySetInnerHTML={{ __html: previewText }}
                  />
                )}
                {selected.kind === 'image' && (
                  <img
                    className="deliverables-panel__preview-image"
                    src={previewUrl}
                    alt={selected.title ?? selected.filename}
                  />
                )}
                {selected.kind === 'figma' && figmaPayload && (
                  <div className="deliverables-panel__figma">
                    {figmaPayload.fileUrl ? (
                      <a
                        href={figmaPayload.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="deliverables-panel__figma-open"
                      >
                        Figma에서 열기 ↗
                      </a>
                    ) : null}
                    {figmaPayload.importJsonUrl ? (
                      <p className="deliverables-panel__figma-url">
                        Import JSON:{' '}
                        <code>{artifactFullUrl(figmaPayload.importJsonUrl)}</code>
                      </p>
                    ) : null}
                    {figmaPayload.message ? (
                      <p className="deliverables-panel__figma-msg">{figmaPayload.message}</p>
                    ) : null}
                    <ol className="deliverables-panel__figma-steps">
                      {(figmaPayload.instructions ?? []).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {selected.kind === 'claude-design' && claudeDesignPayload && (
                  <div className="deliverables-panel__claude-design">
                    <a
                      href={claudeDesignPayload.claudeDesignUrl ?? 'https://claude.ai/design'}
                      target="_blank"
                      rel="noreferrer"
                      className="deliverables-panel__claude-design-open"
                    >
                      Claude Design에서 열기 ↗
                    </a>
                    <button type="button" className="deliverables-panel__copy-prompt" onClick={copyDesignPrompt}>
                      디자인 프롬프트 복사
                    </button>
                    <ol className="deliverables-panel__figma-steps">
                      {(claudeDesignPayload.instructions ?? []).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {['markdown', 'code', 'text', 'json'].includes(selected.kind) && (
                  <pre className="deliverables-panel__preview-body">
                    {loadingPreview ? '불러오는 중…' : previewText || '(빈 파일)'}
                  </pre>
                )}
              </div>
            )}

            {selected && selected.kind === 'pptx' && (
              <div className="deliverables-panel__download-hint">
                <p>PPT 파일은 미리보기 대신 다운로드 후 PowerPoint·Keynote·Google Slides에서 열 수 있습니다.</p>
                <a href={previewUrl} download={selected.filename} className="deliverables-panel__open">
                  {selected.title ?? selected.filename} 다운로드
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
