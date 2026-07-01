interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  let className = 'status-badge '
  let label = status

  if (normalized === 'active') {
    className += 'active'
    label = 'Activa'
  } else if (normalized === 'paused') {
    className += 'paused'
    label = 'Pausada'
  } else {
    className += 'error'
  }

  return (
    <span className={className}>
      <span className="status-badge-dot" />
      {label}
    </span>
  )
}
