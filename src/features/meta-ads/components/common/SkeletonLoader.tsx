const widths = [120, 70, 80, 60, 90, 50, 70, 60, 80, 55]

export function SkeletonTable() {
  return (
    <div className="skeleton-table">
      <div className="skeleton-row">
        {widths.slice(0, 7).map((w, i) => (
          <div key={i} className="skeleton-cell" style={{ width: w, height: 10 }} />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, rowIdx) => (
        <div className="skeleton-row" key={rowIdx}>
          {widths.slice(0, 7).map((w, i) => (
            <div key={i} className="skeleton-cell" style={{ width: w + (rowIdx % 3) * 10, animationDelay: `${rowIdx * 0.08}s` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetrics() {
  return (
    <div className="skeleton-metrics">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-cell" style={{ width: 60, height: 10, marginBottom: 10 }} />
          <div className="skeleton-cell" style={{ width: 90, height: 20 }} />
        </div>
      ))}
    </div>
  )
}
