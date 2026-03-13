/**
 * Skeleton shimmer components for EliAi loading states.
 * Usage: drop these in place of real content while async data loads.
 */

function Shimmer({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(90deg,#1A2035 25%,#252D45 50%,#1A2035 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        ...style,
      }}
    />
  )
}

/* Inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('shimmer-style')) {
  const style = document.createElement('style')
  style.id = 'shimmer-style'
  style.textContent = `
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `
  document.head.appendChild(style)
}

/* ─── Dashboard skeleton ──────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0C0F1A' }}>
      {/* Header area */}
      <div className="px-5 pt-12 pb-5" style={{ background: 'linear-gradient(180deg,#131829 0%,#0C0F1A 100%)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Shimmer style={{ height: 12, width: 100, marginBottom: 8 }} />
            <Shimmer style={{ height: 24, width: 180, marginBottom: 8 }} />
            <Shimmer style={{ height: 14, width: 130 }} />
          </div>
          <Shimmer style={{ width: 64, height: 64, borderRadius: 16 }} />
        </div>
        {/* XP bar */}
        <Shimmer style={{ height: 10, borderRadius: 9999, marginTop: 12 }} />
      </div>

      <div className="px-5 mt-3 space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Shimmer style={{ width: 28, height: 28, borderRadius: 8, margin: '0 auto 8px' }} />
              <Shimmer style={{ height: 18, width: '60%', margin: '0 auto 4px' }} />
              <Shimmer style={{ height: 10, width: '70%', margin: '0 auto' }} />
            </div>
          ))}
        </div>

        {/* Review banner placeholder */}
        <Shimmer style={{ height: 72, borderRadius: 16 }} />

        {/* Subject cards */}
        <div>
          <Shimmer style={{ height: 14, width: 120, marginBottom: 12 }} />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <Shimmer key={i} style={{ height: 96, borderRadius: 16 }} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <Shimmer style={{ height: 12, width: 100, marginBottom: 10 }} />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <Shimmer key={i} style={{ height: 68, borderRadius: 16 }} />
            ))}
          </div>
        </div>

        {/* Goal widget */}
        <Shimmer style={{ height: 130, borderRadius: 16 }} />
      </div>
    </div>
  )
}

/* ─── Progress page skeleton ──────────────────────────────────────── */
export function ProgressSkeleton() {
  return (
    <div className="min-h-screen pb-24 px-5 pt-12" style={{ background: '#0C0F1A' }}>
      <Shimmer style={{ height: 22, width: 160, marginBottom: 20 }} />

      {/* Subject progress bars */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shimmer style={{ width: 32, height: 32, borderRadius: 8 }} />
              <Shimmer style={{ height: 14, width: 110 }} />
            </div>
            <Shimmer style={{ height: 14, width: 36 }} />
          </div>
          <Shimmer style={{ height: 8, borderRadius: 9999 }} />
        </div>
      ))}

      <Shimmer style={{ height: 14, width: 140, marginBottom: 12, marginTop: 20 }} />
      {[0, 1, 2].map(i => (
        <Shimmer key={i} style={{ height: 60, borderRadius: 14, marginBottom: 10 }} />
      ))}
    </div>
  )
}

/* ─── Lesson page skeleton ────────────────────────────────────────── */
export function LessonSkeleton() {
  return (
    <div className="min-h-screen pb-24 px-5 pt-10" style={{ background: '#0C0F1A' }}>
      {/* Back button */}
      <Shimmer style={{ width: 80, height: 32, borderRadius: 10, marginBottom: 20 }} />

      {/* Title */}
      <Shimmer style={{ height: 28, width: '80%', marginBottom: 8 }} />
      <Shimmer style={{ height: 14, width: '50%', marginBottom: 24 }} />

      {/* Content blocks */}
      {[100, 80, 90, 70, 95, 65, 85].map((w, i) => (
        <Shimmer key={i} style={{ height: 14, width: `${w}%`, marginBottom: 10 }} />
      ))}

      {/* Example box */}
      <div className="rounded-2xl p-4 mt-6" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
        <Shimmer style={{ height: 14, width: 80, marginBottom: 12 }} />
        {[90, 75, 85].map((w, i) => (
          <Shimmer key={i} style={{ height: 12, width: `${w}%`, marginBottom: 8 }} />
        ))}
      </div>

      {/* Quiz button */}
      <Shimmer style={{ height: 52, borderRadius: 16, marginTop: 28 }} />
    </div>
  )
}

/* ─── Generic card skeleton (reusable) ───────────────────────────── */
export function CardSkeleton({ lines = 3, height = 80 }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} style={{ height: 12, width: `${70 + i * 5}%`, marginBottom: i < lines - 1 ? 10 : 0 }} />
      ))}
    </div>
  )
}
