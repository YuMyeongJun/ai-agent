export default function StatusPill({ status = 'idle' }) {
  const map = {
    active: { label: '진행 중', className: 'status-pill--active' },
    idle: { label: '대기', className: 'status-pill--idle' },
    reporting: { label: '보고 중', className: 'status-pill--active' },
  }
  const pill = map[status] ?? map.idle

  return (
    <span className={`status-pill ${pill.className}`}>
      <span className="status-pill__dot" />
      {pill.label}
    </span>
  )
}
