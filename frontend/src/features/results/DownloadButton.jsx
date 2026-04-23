import { useState } from 'react'
import { generateAndDownloadPytest } from '../../services/pytestService'
import useTestStore from '../../store/useTestStore'

export default function DownloadButton() {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const { tests, fullTests } = useTestStore()

  if (!tests.length) return null

  const handleClick = () => {
    const source = fullTests?.length ? fullTests : tests
    const downloadable = source.filter((t) => t.playwrightCode)
    if (!downloadable.length) return
    generateAndDownloadPytest(downloadable)
  }

  return (
    <div className="dl-wrap">
      {hovered && <span className="dl-tooltip font-mono">Download pytest file</span>}
      <button
        className={`dl-btn clay-btn ${pressed ? 'pressed' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        aria-label="Download pytest file"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      <style>{`
        .dl-wrap {
          position: fixed;
          bottom: 32px;
          right: 32px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          z-index: 200;
        }

        .dl-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          padding: 0;
          color: var(--text-primary);
        }

        .dl-btn:hover:not(:disabled) {
          transform: translateY(-3px);
        }

        .dl-tooltip {
          background: linear-gradient(145deg, #FDFAF4, #EDE8DC);
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow: 4px 4px 12px rgba(0,0,0,0.1), -2px -2px 8px rgba(255,255,255,0.9);
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
          animation: slide-up-fade 0.18s ease;
        }
      `}</style>
    </div>
  )
}
