import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import UrlInput from './UrlInput'
import { startSSE } from '../../services/sseService'
import useTestStore from '../../store/useTestStore'

const INFO_CHIPS = [
  { label: 'UI Tests',       icon: '◈' },
  { label: 'Form Validation', icon: '⬡' },
  { label: 'Link Checks',    icon: '⬢' },
  { label: 'API Tests',      icon: '⬟' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const titleRef = useRef(null)
  const { status, setUrl, startScan, reset } = useTestStore()

  // Reset store when arriving at home
  useEffect(() => { reset() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Parallax text shadow on mouse move
  useEffect(() => {
    const onMove = (e) => {
      if (!titleRef.current) return
      const dx = (e.clientX / window.innerWidth  - 0.5) * 12
      const dy = (e.clientY / window.innerHeight - 0.5) * 12
      titleRef.current.style.textShadow =
        `${dx}px ${dy}px 24px rgba(0,0,0,0.1), ${-dx * 0.5}px ${-dy * 0.5}px 16px rgba(255,255,255,0.7)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleSubmit = (url) => {
    setUrl(url)
    startScan()
    startSSE(url)
    navigate('/results')
  }

  const isRunning = status === 'scanning'

  return (
    <div className="home">
      {/* Drifting background blobs */}
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />

      <div className="hero">
        <p className="eyebrow font-mono">Powered by GPT-4o-mini + Playwright</p>

        <h1 className="title font-display" ref={titleRef}>
          QA Agent
        </h1>

        <p className="subtitle font-body">
          Drop any URL. Get a full test suite in seconds.
        </p>

        <UrlInput onSubmit={handleSubmit} disabled={isRunning} />

        <div className="chips">
          {INFO_CHIPS.map((chip, i) => (
            <div
              key={chip.label}
              className="chip clay-card animate-slide-up"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <span className="chip-icon">{chip.icon}</span>
              <span className="chip-label font-mono">{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .home {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 48px 20px;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.55;
        }

        .b1 {
          width: 640px; height: 640px;
          background: radial-gradient(circle, #EDEADF, #E5DDD0);
          top: -220px; left: -200px;
          animation: drift-blob 16s ease-in-out infinite;
        }

        .b2 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #F0ECE4, #E8E2D6);
          bottom: -160px; right: -120px;
          animation: drift-blob 20s ease-in-out infinite reverse;
        }

        .b3 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #F8F5EE, #EDE8DC);
          top: 45%; left: 55%;
          transform: translate(-50%, -50%);
          animation: drift-blob 13s ease-in-out infinite 4s;
        }

        .hero {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 28px;
          max-width: 800px;
          width: 100%;
        }

        .eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--text-muted);
          padding: 6px 18px;
          background: rgba(0,0,0,0.04);
          border-radius: 100px;
          border: 1px solid var(--border-subtle);
          animation: slide-up-fade 0.5s ease 0s forwards;
          opacity: 0;
        }

        .title {
          font-size: clamp(68px, 13vw, 96px);
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
          letter-spacing: -0.025em;
          transition: text-shadow 0.08s ease;
          animation: slide-up-fade 0.55s ease 0.05s forwards;
          opacity: 0;
        }

        .subtitle {
          font-size: 19px;
          color: var(--text-secondary);
          max-width: 440px;
          line-height: 1.65;
          animation: slide-up-fade 0.55s ease 0.1s forwards;
          opacity: 0;
        }

        .chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          opacity: 0;
        }

        .chip-icon {
          font-size: 15px;
          color: var(--amber-deep);
        }

        .chip-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  )
}
