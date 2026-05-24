import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { artifactFullUrl } from '../api/missionApi'

function ArtifactBody({ artifact }) {
  const [text, setText] = useState(artifact.preview ?? '')
  const url = artifactFullUrl(artifact.url)

  useEffect(() => {
    if (!['markdown', 'code', 'xml'].includes(artifact.kind)) return

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

  if (artifact.kind === 'pdf') {
    return <iframe title={artifact.title} src={url} className="result-viewer__iframe" />
  }

  if (artifact.kind === 'midi') {
    return (
      <div className="result-viewer__audio-wrap">
        <p className="result-viewer__hint">생성된 MIDI 파일</p>
        <audio controls src={url} className="result-viewer__audio" />
        <a href={url} download className="result-viewer__download">
          MIDI 다운로드
        </a>
      </div>
    )
  }

  if (['markdown', 'code', 'xml'].includes(artifact.kind)) {
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

export default function ResultViewer({ artifact, visible, onClose }) {
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
