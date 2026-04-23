import { useState, useRef } from 'react'

export default function UrlInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const inputRef = useRef(null)
  const hasValue = value.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 700 }}>
      <div className={`url-bar clay-card ${focused ? 'url-bar--focused' : ''}`}>
        {/* Idle scanner line */}
        {!focused && !hasValue && <div className="url-scanner" />}

        {/* Floating label */}
        <label
          className={`url-label ${focused || hasValue ? 'url-label--active' : ''}`}
          onClick={() => inputRef.current?.focus()}
        >
          Enter any website URL
        </label>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="url-input"
          placeholder={focused ? 'https://example.com' : ''}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label="Website URL"
        />

        <button
          type="submit"
          className={`run-btn clay-btn ${pressed ? 'pressed' : ''}`}
          disabled={disabled || !hasValue}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          aria-label="Run QA Agent"
        >
          {disabled ? (
            <svg
              className="spin-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
          <span>{disabled ? 'Running…' : 'Run Agent'}</span>
        </button>
      </div>

      <style>{`
        .url-bar {
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px 8px 8px 22px;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .url-bar--focused {
          transform: scale(1.01);
          box-shadow:
            8px 8px 16px rgba(0,0,0,0.12),
            -4px -4px 12px rgba(255,255,255,0.95),
            inset 0 1px 0 rgba(255,255,255,0.8),
            inset 0 -1px 0 rgba(0,0,0,0.05),
            0 0 0 2.5px rgba(244,162,97,0.45);
        }

        .url-scanner {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 35%;
          background: linear-gradient(90deg, transparent, rgba(244,162,97,0.14), transparent);
          animation: scanner 2.4s linear infinite;
          pointer-events: none;
        }

        .url-label {
          position: absolute;
          left: 22px;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          color: var(--text-muted);
          pointer-events: none;
          transition: top 0.2s ease, font-size 0.2s ease, color 0.2s ease;
          z-index: 1;
        }

        .url-label--active {
          top: 10px;
          transform: translateY(0);
          font-size: 9.5px;
          color: var(--amber-deep);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .url-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Mono', monospace;
          font-size: 15px;
          color: var(--text-primary);
          padding: 20px 10px 8px 0;
          min-width: 0;
        }

        .url-input::placeholder {
          color: var(--text-muted);
          opacity: 0.45;
        }

        .run-btn {
          padding: 13px 22px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
          border-radius: 14px;
        }

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </form>
  )
}
