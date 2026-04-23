import { useState, useEffect, useRef } from 'react'

const CAT_COLOR = {
  ui:         '#1B4965',
  form:       '#B5541A',
  navigation: '#2D6A4F',
  api:        '#5B21B6',
}

const STATUS_BADGE = {
  queued:  { cls: 'badge-queued',  label: 'QUEUED'  },
  running: { cls: 'badge-running', label: 'RUNNING' },
  passed:  { cls: 'badge-pass',    label: 'PASS'    },
  failed:  { cls: 'badge-fail',    label: 'FAIL'    },
}

const CAT_BADGE = {
  ui:         'badge-ui',
  form:       'badge-form',
  navigation: 'badge-navigation',
  api:        'badge-api',
}

export default function TestCard({ test, index }) {
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible]   = useState(false)
  const ref = useRef(null)

  // Intersection observer for staggered entrance
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const statusInfo = STATUS_BADGE[test.status] || STATUS_BADGE.queued
  const catColor   = CAT_COLOR[test.category] || '#5C5347'
  const catBadge   = CAT_BADGE[test.category] || ''

  const isShaking  = test.status === 'failed'
  const isGreen    = test.status === 'passed'

  const progressW =
    test.status === 'queued'  ? '0%'   :
    test.status === 'running' ? '55%'  : '100%'

  return (
    <article
      ref={ref}
      className={[
        'tc clay-card clay-card-hover',
        visible  ? 'tc--visible'  : '',
        isGreen  ? 'tc--passed'   : '',
        isShaking ? 'tc--failed'  : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--cat': catColor,
        '--delay': `${index * 0.045}s`,
      }}
    >
      {/* Left edge colour bar */}
      <div className="tc-bar" />

      <div className="tc-body">
        {/* ── Header ─────────────────────────────── */}
        <div className="tc-header">
          <h3 className="tc-title font-display">{test.title}</h3>
          <div className="tc-badges">
            <span className={`badge ${catBadge}`}>{test.category}</span>
            <span className={`badge ${statusInfo.cls}`}>
              {statusInfo.label}
              {test.status === 'passed' && (
                <span className="check animate-check">✓</span>
              )}
            </span>
          </div>
        </div>

        {/* ── Steps ──────────────────────────────── */}
        {test.steps?.length > 0 && (
          <div className="tc-steps">
            <button
              className="steps-toggle font-mono"
              onClick={() => setExpanded((p) => !p)}
              aria-expanded={expanded}
            >
              <span>{expanded ? '▾' : '▸'}</span>
              <span>{test.steps.length} step{test.steps.length !== 1 ? 's' : ''}</span>
            </button>

            {expanded && (
              <ol className="steps-list animate-fade-in">
                {test.steps.map((step, i) => (
                  <li key={i} className="step">
                    <span className="step-n clay-card font-mono">{i + 1}</span>
                    <span className="step-txt font-body">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* ── Error message ──────────────────────── */}
        {test.status === 'failed' && test.error && (
          <div className="tc-error">
            <span className="error-lbl font-mono">Error</span>
            <code className="error-txt font-mono">{test.error}</code>
          </div>
        )}

        {/* ── Footer ─────────────────────────────── */}
        <div className="tc-footer">
          <div className="prog-track">
            <div
              className={`prog-fill prog-fill--${test.status}`}
              style={{ width: progressW }}
            />
          </div>
          {test.duration > 0 && (
            <span className="tc-dur font-mono">{test.duration}s</span>
          )}
        </div>
      </div>

      <style>{`
        .tc {
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity  0.5s ease var(--delay),
            transform 0.5s ease var(--delay),
            box-shadow 0.3s ease,
            background 0.4s ease;
        }

        .tc--visible  { opacity: 1; transform: translateY(0); }
        .tc--passed   { background: linear-gradient(145deg, #f3fdf7, #ebf8f2) !important; }
        .tc--failed   { background: linear-gradient(145deg, #fdf3f3, #f8ebeb) !important; animation: shake 0.5s ease; }

        .tc-bar {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: var(--cat);
          border-radius: 20px 0 0 20px;
        }

        .tc-body {
          padding: 18px 18px 14px 22px;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .tc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .tc-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.35;
          flex: 1;
        }

        .tc-badges {
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .check {
          display: inline-block;
          margin-left: 4px;
          font-weight: 700;
        }

        /* Steps */
        .tc-steps { display: flex; flex-direction: column; gap: 7px; }

        .steps-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          padding: 0;
          transition: color 0.2s;
        }
        .steps-toggle:hover { color: var(--text-secondary); }

        .steps-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding-left: 2px;
        }

        .step {
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .step-n {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 21px;
          height: 21px;
          font-size: 10px;
          color: var(--text-secondary);
          flex-shrink: 0;
          border-radius: 8px;
          padding: 0;
        }

        .step-txt {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          padding-top: 2px;
        }

        /* Error */
        .tc-error {
          background: rgba(155,34,38,0.06);
          border: 1px solid rgba(230,57,70,0.2);
          border-radius: 10px;
          padding: 9px 13px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .error-lbl {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--red-deep);
        }

        .error-txt {
          font-size: 11.5px;
          color: var(--red-deep);
          word-break: break-word;
          white-space: pre-wrap;
        }

        /* Footer */
        .tc-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 2px;
        }

        .prog-track {
          flex: 1;
          height: 3px;
          background: rgba(0,0,0,0.06);
          border-radius: 100px;
          overflow: hidden;
        }

        .prog-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.7s ease;
        }

        .prog-fill--queued  { width: 0 !important; }
        .prog-fill--running {
          background: linear-gradient(90deg, var(--amber-glow), var(--amber-deep), var(--amber-glow));
          background-size: 200% auto;
          animation: progress-shimmer 1.4s linear infinite;
        }
        .prog-fill--passed  { background: var(--green-glow); }
        .prog-fill--failed  { background: var(--red-glow); }

        .tc-dur {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </article>
  )
}
