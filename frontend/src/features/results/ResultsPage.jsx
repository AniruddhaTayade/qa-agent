import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useTestStore from '../../store/useTestStore'
import SummaryBar from './SummaryBar'
import CategoryTabs from './CategoryTabs'
import TestCard from './TestCard'
import DownloadButton from './DownloadButton'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { url, status, tests, summary, error, reset } = useTestStore()
  const [activeCategory, setActiveCategory] = useState('all')

  // Redirect to home if no scan is running (e.g. direct navigation to /results)
  useEffect(() => {
    if (status === 'idle') navigate('/')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    activeCategory === 'all'
      ? tests
      : tests.filter((t) => t.category === activeCategory)

  const progress =
    summary.total > 0
      ? Math.round(((summary.passed + summary.failed) / summary.total) * 100)
      : 0

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (status === 'error') {
    const isExpired     = /expired|token/i.test(error || '')
    const isRateLimited = /rate limit|429|too many/i.test(error || '')

    return (
      <div className="rp-error-page">
        <div className="rp-error-card clay-card animate-slide-up">
          <div className="err-icon">{isRateLimited ? '⏱' : '⚠'}</div>
          <h2
            className="font-display"
            style={{ fontSize: 22, marginBottom: 8, color: 'var(--text-primary)' }}
          >
            {isExpired     ? 'Session Expired'    :
             isRateLimited ? 'Too Many Requests'  :
                             'Scan Failed'}
          </h2>
          <p
            className="font-body"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 28 }}
          >
            {isExpired
              ? 'Your scan session expired. Tokens are single-use and valid for 60 seconds.'
              : isRateLimited
              ? 'You\'ve hit the rate limit. Please wait a moment before trying again.'
              : error}
          </p>
          <button
            className="clay-btn"
            style={{ padding: '11px 30px', fontSize: 13 }}
            onClick={() => { reset(); navigate('/') }}
          >
            ← Back to Home
          </button>
        </div>

        <style>{`
          .rp-error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .rp-error-card {
            max-width: 480px;
            width: 100%;
            padding: 48px 40px;
            text-align: center;
          }
          .err-icon { font-size: 44px; margin-bottom: 14px; }
        `}</style>
      </div>
    )
  }

  /* ── Normal results view ─────────────────────────────────────────────── */
  return (
    <div className="rp">
      <SummaryBar url={url} summary={summary} progress={progress} status={status} />

      <main className="rp-body">
        <div className="rp-controls">
          <CategoryTabs
            active={activeCategory}
            onChange={setActiveCategory}
            tests={tests}
          />

          {status === 'complete' && (
            <span className="done-tag font-mono animate-fade-in">
              ✓ Scan complete
            </span>
          )}
        </div>

        {/* Waiting for first queued cards */}
        {tests.length === 0 && status === 'scanning' && (
          <div className="rp-scanning">
            <div className="scanning-ring" />
            <p className="font-mono">Analysing website and generating test cases…</p>
          </div>
        )}

        {/* Active filter has no matches */}
        {filtered.length === 0 && tests.length > 0 && (
          <p className="rp-empty font-body">
            No {activeCategory === 'all' ? '' : activeCategory + ' '}tests found.
          </p>
        )}

        <div className="rp-grid">
          {filtered.map((test, i) => (
            <TestCard key={test.id} test={test} index={i} />
          ))}
        </div>
      </main>

      <DownloadButton />

      <style>{`
        .rp { min-height: 100vh; background: var(--bg-page); }

        .rp-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 24px 110px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .rp-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .done-tag {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--green-deep);
          padding: 5px 14px;
          background: rgba(45,106,79,0.08);
          border: 1px solid rgba(82,183,136,0.3);
          border-radius: 100px;
        }

        .rp-scanning {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--text-muted);
          font-size: 13px;
          padding: 16px 4px;
        }

        .scanning-ring {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0,0,0,0.08);
          border-top-color: var(--amber-glow);
          border-radius: 50%;
          flex-shrink: 0;
          animation: spin 0.75s linear infinite;
        }

        .rp-empty {
          color: var(--text-muted);
          font-size: 15px;
          padding: 20px 4px;
        }

        .rp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 18px;
        }

        @media (max-width: 560px) {
          .rp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
