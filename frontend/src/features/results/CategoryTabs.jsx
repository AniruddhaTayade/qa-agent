const TABS = [
  { key: 'all',        label: 'All'        },
  { key: 'ui',         label: 'UI'         },
  { key: 'form',       label: 'Form'       },
  { key: 'navigation', label: 'Navigation' },
  { key: 'api',        label: 'API'        },
]

export default function CategoryTabs({ active, onChange, tests }) {
  const counts = TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === 'all'
      ? tests.length
      : tests.filter((t) => t.category === tab.key).length
    return acc
  }, {})

  return (
    <div className="tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab clay-btn ${active === tab.key ? 'tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {counts[tab.key] > 0 && (
            <span className="tab-count font-mono">{counts[tab.key]}</span>
          )}
        </button>
      ))}

      <style>{`
        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          padding: 8px 18px;
          font-size: 12px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 7px;
          letter-spacing: 0.04em;
        }

        .tab--active {
          box-shadow:
            2px 2px 6px rgba(0,0,0,0.14),
            -1px -1px 4px rgba(255,255,255,0.9),
            inset 2px 2px 6px rgba(0,0,0,0.08),
            inset -1px -1px 4px rgba(255,255,255,0.6) !important;
          background: linear-gradient(145deg, #EDE8DC, #FDFAF4) !important;
          transform: translateY(1px) !important;
          color: var(--text-primary);
          font-weight: 500;
        }

        .tab-count {
          font-size: 10px;
          background: rgba(0,0,0,0.07);
          padding: 1px 7px;
          border-radius: 100px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
