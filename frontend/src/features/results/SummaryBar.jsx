const STAT_META = {
  total:   { color: 'var(--blue-deep)',  bg: 'rgba(27,73,101,0.07)'  },
  passed:  { color: 'var(--green-deep)', bg: 'rgba(45,106,79,0.07)'  },
  failed:  { color: 'var(--red-deep)',   bg: 'rgba(155,34,38,0.07)'  },
  running: { color: 'var(--amber-deep)', bg: 'rgba(181,84,26,0.07)'  },
}

export default function SummaryBar({ url, summary, progress, status }) {
  const stats = [
    { key: 'total',   label: 'Total',   value: summary.total   },
    { key: 'passed',  label: 'Passed',  value: summary.passed  },
    { key: 'failed',  label: 'Failed',  value: summary.failed  },
    { key: 'running', label: 'Running', value: summary.running },
  ]

  return (
    <header className="summary-bar">
      <div className="bar-inner">
        <div className="bar-url">
          <span className="url-tag font-mono">Testing:</span>
          <span className="url-text font-mono">{url}</span>
        </div>

        <div className="stat-row">
          {stats.map(({ key, label, value }) => (
            <div
              key={key}
              className="stat-chip clay-card"
              style={{
                '--c': STAT_META[key].color,
                '--b': STAT_META[key].bg,
              }}
            >
              <span className="stat-num font-mono">{value}</span>
              <span className="stat-lbl font-body">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {status === 'scanning' && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
      )}

      <style>{`
        .summary-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: linear-gradient(135deg,
            rgba(253,250,244,0.97),
            rgba(237,232,220,0.97));
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border-subtle);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .bar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .bar-url {
          flex: 1;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .url-tag {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .url-text {
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stat-chip {
          padding: 9px 14px;
          text-align: center;
          min-width: 64px;
          background: var(--b) !important;
        }

        .stat-num {
          display: block;
          font-size: 21px;
          font-weight: 500;
          color: var(--c);
          line-height: 1;
        }

        .stat-lbl {
          display: block;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 3px;
        }

        .progress-track {
          height: 4px;
          background: var(--bg-secondary);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            var(--green-glow),
            var(--amber-glow),
            var(--green-glow)
          );
          background-size: 200% auto;
          animation: progress-shimmer 1.8s linear infinite;
          transition: width 0.6s ease;
        }
      `}</style>
    </header>
  )
}
