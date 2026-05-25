import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { artifactFullUrl } from '../../../hooks/client/missionClient'
import type { IArtifact } from '../../../models/interface/res/IMissionEventRes'

const ArtifactBody = ({ artifact }: { artifact: IArtifact }) => {
  const [text, setText] = useState(artifact.preview ?? '')
  const url = artifactFullUrl(artifact.url)

  useEffect(() => {
    if (!['markdown', 'code'].includes(artifact.kind)) return undefined

    let cancelled = false
    fetch(url)
      .then((res) => res.text())
      .then((body) => {
        if (!cancelled) setText(body)
      })
      .catch(() => {
        if (!cancelled) setText('파일을 불러올 수 없습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [artifact.kind, url])

  if (['markdown', 'code'].includes(artifact.kind)) {
    return <pre className="result-viewer__pre">{text || '내용을 불러오는 중...'}</pre>
  }

  return (
    <div className="result-viewer__fallback">
      <p>{artifact.title}</p>
      <a href={url} target="_blank" rel="noreferrer" className="result-viewer__download">
        파일 열기
      </a>
    </div>
  )
}

export interface ICommandCenterResultViewerProps {
  artifact: IArtifact | null
  visible: boolean
  onClose: () => void
  onPlayInMonitor?: () => void
  sessionId: string | null
}

export const CommandCenterResultViewer = ({
  artifact,
  visible,
  onClose,
}: ICommandCenterResultViewerProps) => {
  return (
    <AnimatePresence>
      {visible && artifact && (
        <motion.div
          className="result-viewer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="result-viewer"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="result-viewer__header">
              <div>
                <h3>{artifact.title ?? artifact.filename}</h3>
                <p>{artifact.filename}</p>
              </div>
              <button type="button" className="result-viewer__close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="result-viewer__body">
              <ArtifactBody artifact={artifact} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
