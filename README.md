# QA Agent — AI-Powered Test Automation

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-latest-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-Container_Apps-0078D4?style=flat-square&logo=microsoftazure&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-AI_Generated-blueviolet?style=flat-square)

> *"Drop any URL. Get a full test suite. Pretend you wrote it yourself."*

---

## What Is This?

**QA Agent** is an AI-powered test automation tool that does in 30 seconds what a manual QA engineer takes three sprints to avoid doing.

You paste a URL. The AI scrapes the page, understands its structure, generates categorized Playwright test cases across **UI**, **Form**, **Navigation**, and **API** dimensions, *executes them live in a headless browser*, streams the results to a real-time dashboard, and hands you a downloadable `pytest` file.

Your manager sees a test suite. You see 30 seconds of work. Everyone wins. Except the bugs — they do not win.

---

## Why I Built This

I have written, at a conservative estimate, approximately **ten thousand** test cases by hand over 2.5 years as an SDET. Every single one started the same way: open browser, click around, write `assert page.title == "..."`, realize you typed the title wrong, fix it, run it, watch it pass locally, watch it fail in CI because someone changed a class name, update it, get the PR approved, repeat until the heat death of the universe.

One day I asked GPT to write a test case for a login form. It wrote a better one than I would have. In about four seconds. While I was still deciding what to name the test function.

So I built this. It's not magic — it's a very well-prompted language model sitting on top of a Playwright harness with some sensible engineering around it. But it turns "I should write tests for this" from a task you defer for two weeks into something you do before your coffee gets cold.

Also, I needed a portfolio project. Two birds, one AI-generated stone.

---

## How It Works

### The Happy Path

```
You              QA Agent             OpenAI              Playwright
 |                   |                    |                    |
 |-- paste URL ----->|                    |                    |
 |                   |-- scrape page ---->|                    |
 |                   |                    |                    |
 |                   |-- send structure ->|                    |
 |                   |<-- test cases JSON-|                    |
 |                   |                    |                    |
 |                   |-- exec tests -------------------------->|
 |<-- live results via SSE ------------------------------------|
 |                   |                    |                    |
 |-- download .py -->|                    |                    |
```

### The Two-Pass AI System

The AI doesn't just generate tests once and hope for the best. That would be naive. Instead:

**Pass 1 — Generation.** The page structure (title, headings, forms, links, scripts) is sent to `gpt-4o-mini` through four specialized generators — one each for UI, Form, Navigation, and API test categories. They run sequentially, each with a tailored system prompt. The result is up to 15 test cases as raw JSON.

**Pass 2 — Validation.** For any test case where the AI got ambitious and wrote more than 5 steps, the `playwrightCode` is sent back to the model with a terse prompt: *"Fix this. No imports. Snake case. async def run_test(page): only."* The model corrects itself. This is peak software engineering — having an AI peer-review its own code so you don't have to.

Each test then runs in its own isolated Python subprocess, completely decoupled from the FastAPI event loop. Results stream back to the frontend via Server-Sent Events, updating the dashboard card-by-card in real time. It looks impressive in demos. This was intentional.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)             │
│                                                         │
│  HomePage ──> UrlInput ──> [GET /api/token]             │
│                    │                                    │
│                    └──> [GET /api/run-tests?url=...     │
│                              &token=...] (SSE stream)   │
│                                                         │
│  ResultsPage <── Zustand Store <── sseService.js        │
│  SummaryBar / CategoryTabs / TestCard / DownloadButton  │
└──────────────────────────┬──────────────────────────────┘
                           │ SSE (fetch + ReadableStream)
┌──────────────────────────▼───────────────────────────────┐
│                   Backend (FastAPI)                      │
│                                                          │
│  /api/token  ──> HMAC token (60s TTL, single-use)        │
│  /api/run-tests                                          │
│       │                                                  │
│       ├── validate token + URL (SSRF check)              │
│       ├── scraper.py  (httpx + BeautifulSoup)            │
│       │                                                  │
│       ├── openai_service.py                              │
│       │     ├── UITestGenerator                          │
│       │     ├── FormTestGenerator       ← sequential     │
│       │     ├── NavigationTestGenerator ← 4 API calls    │
│       │     └── APITestGenerator                         │
│       │                                                  │
│       └── playwright_runner.py                           │
│             └── subprocess per test (isolated event loop)│
│                   → temp .py harness → chromium headless │
└──────────────────────────────────────────────────────────┘
```

---

## What It Actually Tests vs. What It Claims To Test

Honesty is a core value here. Here is a table.

| Category | What the AI says it's testing | What it's actually testing |
|---|---|---|
| **UI** | "Verifies page title, heading hierarchy, and visual integrity" | That `document.title` exists and `h1` isn't empty |
| **Form** | "Validates required fields and error message display" | That clicking submit on an empty form doesn't crash Playwright |
| **Navigation** | "Ensures all internal links resolve and routing works correctly" | That `page.goto()` doesn't return a 404 |
| **API** | "Intercepts network requests and validates response schemas" | DOM assertions after the page loads, because the AI has been gently discouraged from touching `wait_for_response` on SPAs |

This is not a criticism of the tool. This is a description of what Playwright can deterministically verify in 15 seconds. It is, coincidentally, also a description of what most handwritten test suites actually test once you remove the tests that are just commented out.

---

## Testimonials

> *"Finally, a tool that finds bugs faster than my manager finds excuses to push the release anyway."*
> — **Priya K., Senior QA Engineer**

> *"I've been writing 'TODO: add tests' in PR comments for three years. Now I just run this and delete the comment."*
> — **Marcus T., Full-Stack Developer who is technically also QA now**

> *"The AI wrote better test case titles than I do. I've been in this industry for eleven years. I'm fine."*
> — **Dave R., Principal SDET, definitely fine**

> *"It still says 'works on my machine' sometimes, but now it says it from a headless Chromium subprocess, which is more sophisticated."*
> — **Anonymous, Staff Engineer at a well-known company*

> *"I showed this to our manual QA team. They asked if it could also attend standup."*
> — **Shreya M., Engineering Manager**

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast builds, fast dev server, fast excuses |
| State | Zustand | Redux without the therapy |
| Styling | Tailwind CSS + custom clay morphism | It looks good. That's the reason. |
| Backend | FastAPI (Python) | Async, typed, auto-documented, and the OpenAI SDK is also Python |
| AI | OpenAI gpt-4o-mini | Smart enough for test generation, cheap enough to not feel guilty about |
| Browser | Playwright (Python) | The only test framework where "it worked in headless" is a complete sentence |
| Streaming | SSE via `fetch` + ReadableStream | Native EventSource can't send custom headers. Neither can stubbornness. |
| Rate Limiting | slowapi | Because someone will absolutely try to run 50 scans per minute |
| Deployment | Azure Container Apps + Static Web Apps | It works. Pricing is predictable. The dashboard is not confusing. Mostly. |

---

## Prerequisites

Before you begin, ensure you have:

- **Python 3.9+** — If you're on 3.8, it'll probably work. If you're on 3.7, please update Python and also reconsider some life choices.
- **Node.js 18+** — For the frontend. Yes, you need Node even though the backend is Python. This is web development.
- **An OpenAI API key** — The kind that has actual credits attached to it. The free tier will not spark joy here.
- **Git** — You have this. You're reading a README on GitHub.

---

## Local Development

### Backend Setup

```bash
# Clone the repo (you probably already did this)
git clone https://github.com/AniruddhaTayade/qa-agent.git
cd qa-agent/backend

# Create a virtual environment
# (don't skip this — your global Python install has feelings)
python -m venv venv

# Activate it
source venv/bin/activate          # macOS/Linux
venv\Scripts\activate             # Windows (PowerShell)
venv\Scripts\activate.bat         # Windows (CMD, if you're old school)

# Install dependencies
pip install -r requirements.txt

# Install the Playwright browser
# (this downloads ~120MB of Chromium — worth it)
playwright install chromium

# Set up your secrets
cp .env.example .env
# Now open .env and fill in your actual values
# The file has comments. Read the comments.
```

**Generate a `SECRET_KEY`** (don't skip this step and use "password123"):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```bash
# Start the dev server
uvicorn main:app --reload --port 8000

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     OpenAI API key loaded successfully
# That second line is important. If you see a warning instead, the .env didn't load.
```

### Frontend Setup

```bash
# In a separate terminal
cd qa-agent/frontend

npm install
# (this takes a moment. use this time to reflect on npm install times.)

npm run dev
# Opens at http://localhost:5173
# Proxies /api/* to http://localhost:8000 automatically
```

Open `http://localhost:5173`, paste any URL, watch it work. If it doesn't work, check the backend terminal first — the answer is almost certainly there.

---

## Environment Variables

All secrets live in `backend/.env`. Here's what each one does and why it exists:

```env
# Your OpenAI API key. Starts with sk-.
# This is the one variable where "just hardcode it temporarily" ends careers.
OPENAI_API_KEY=sk-your-key-here

# A long random string used to sign HMAC scan tokens.
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
# Do not use your dog's name. Do not use "secret". Do not use this placeholder.
SECRET_KEY=generate-a-long-random-string-here

# The frontend URL for production CORS configuration.
# In development, leave this blank — all origins are allowed.
# In production, set it to your Static Web Apps URL.
# If you set this to "*" in production you will feel bad and you should.
FRONTEND_URL=https://your-frontend-domain.com
```

---

## API Endpoints

### `GET /api/token`

Issues a single-use, 60-second HMAC-signed scan token. Call this before every scan. Tokens are not reusable — if you try to reuse one you'll get a 401 with the phrase "Token has already been used," which is not a metaphor.

**Rate limit:** 20 requests/minute per IP.

**Response:**
```json
{ "token": "64hexchars:timestamp:64hexchars" }
```

### `GET /api/run-tests?url={url}&token={token}`

The main event. Streams Server-Sent Events for the duration of the scan.

**Rate limit:** 5 requests/minute per IP.

**Headers:** `Content-Type: text/event-stream`

**Event stream:**
```
data: {"type": "status", "message": "Scraping page structure…"}

data: {"type": "test-update", "test": {"id": "ui_1", "status": "queued", "title": "...", ...}}

data: {"type": "test-update", "test": {"id": "ui_1", "status": "running"}}

data: {"type": "test-update", "test": {"id": "ui_1", "status": "passed", "duration": 2.341}}

data: {"type": "complete", "summary": {"total": 12, "passed": 9, "failed": 3}, "tests": [...]}
```

**Security checks (all done inside the stream so errors surface as SSE events):**
- Token signature valid
- Token not expired (60s TTL)
- Token not already used
- URL is http/https only
- URL ≤ 500 characters
- Hostname is not localhost, 127.x, or any private IP range (SSRF protection)

---

## Security

Because "it's just a demo" is how data breaches start:

### HMAC Scan Tokens
Every scan requires a fresh token from `/api/token`. Tokens are signed with `HMAC-SHA256` using your `SECRET_KEY`, expire in 60 seconds, and are single-use (marked as consumed on first use, stored in an in-memory set). This prevents replay attacks and casual abuse.

### SSRF Protection
The URL validator rejects:
- `localhost` and `127.0.0.1`
- All private IP ranges: `10.x.x.x`, `172.16–31.x.x`, `192.168.x.x`
- Link-local addresses: `169.254.x.x`
- IPv6 loopback and private ranges
- Anything over 500 characters

This stops someone from using your QA Agent to scan your own internal infrastructure. Which someone would absolutely try.

### Rate Limiting
`slowapi` enforces limits at the IP level:
- `/api/token` — 20 requests/minute
- `/api/run-tests` — 5 requests/minute

Exceeded limits return HTTP 429 with a JSON error. The frontend detects 429 specifically and shows a human-readable message instead of "Connection lost."

### No Data Persistence
Zero. The backend stores nothing about your scans. Tokens live in an in-memory set that's gone when the server restarts. There's no database. The AI-generated test cases exist only in the SSE stream and then in your downloaded file. This isn't a privacy feature — it's just that a stateful QA agent would have been a lot more work, and stateless is architecturally cleaner anyway.

### CORS
Development: all origins allowed (wildcard). Production: restricted to the exact `FRONTEND_URL` set in your environment. The `allow_credentials=True` + wildcard combination that breaks browsers in production is explicitly avoided.

---

## Deployment (Azure)

The same stack as every other project in this portfolio. It works. Here's how.

### Backend → Azure Container Apps

```bash
cd backend

# Build the image targeting linux/amd64
# (critical if you're on Apple Silicon — Azure runs Intel)
docker build --platform linux/amd64 -t yourdockerhubuser/qa-agent-backend:latest .
docker push yourdockerhubuser/qa-agent-backend:latest
```

In the Azure Portal (or via CLI), create a Container App and set these environment variables. Do not put them in the image. The image is public:

```
OPENAI_API_KEY       → your actual key (mark as secret)
SECRET_KEY           → your generated key (mark as secret)
FRONTEND_URL         → https://your-app.azurestaticapps.net
```

The `playwright install chromium` step needs to happen inside the Docker image. Here's a minimal `Dockerfile` for the `backend/` directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend → Azure Static Web Apps

```bash
cd frontend

# Set your backend URL before building
# In Azure Static Web Apps, set this as an environment variable:
# VITE_API_BASE_URL = https://your-backend.azurecontainerapps.io

npm run build
# Outputs to dist/
# Deploy dist/ to Azure Static Web Apps
# Either via the Azure portal, GitHub Actions, or the SWA CLI
```

The Vite proxy in `vite.config.js` only applies in development. In production, `VITE_API_BASE_URL` is baked into the build at compile time. If you forget to set it, the frontend will make API calls to `undefined`, which is a real URL to some browsers and a very confusing error for you.

---

## Known Issues

Being honest here is a form of respect.

| Issue | Status | Notes |
|---|---|---|
| API test category is weaker than the others | Known | Modern SPAs don't expose traditional REST calls to Playwright. The API generator now tests DOM state after load, which is technically a UI test wearing an API test costume. |
| Tests sometimes fail on sites with aggressive anti-bot measures | Known | Headless Chromium looks like a bot because it is a bot. Cloudflare and friends know this. |
| Token validation errors show generic messages on rate limit | Won't fix | HTTP 429 fires before the SSE stream starts. The frontend detects it. Life is imperfect. |
| The `_used_tokens` set grows until server restart | Low priority | Tokens expire in 60 seconds. The set only holds the payload hex, ~64 bytes per entry. You'd need a lot of scans to notice. |
| AI occasionally generates tests that navigate to the wrong URL | Rare | The system prompt explicitly says to navigate first. GPT-4o-mini occasionally ignores this in the same way developers occasionally ignore code review comments. |
| "Works on my machine" | Permanent | Some things are universal. |

---

## Contributing

PRs are welcome. A few things to know before you open one:

**The test suite for this project is AI-generated.** This is intentional and extremely on-brand. It is also a meaningful constraint: if you change behavior, the AI-generated tests may not catch it, because they were generated for the original behavior. Please write actual tests for anything load-bearing.

**The design system is intentional.** The clay morphism aesthetic, the warm beige palette, the Playfair Display headings — this was a deliberate choice, not an accident or a placeholder. If your PR changes the visual design, include screenshots and a compelling reason.

**Commit messages should be human-readable.** `fix bug` is not a commit message. `fix: handle empty playwrightCode gracefully in runner` is a commit message.

**Open an issue before a big PR.** Not because I'll say no, but because I might say "I was literally about to do that differently" and we can save both of us time.

---

## Built By

**Aniruddha Tayade** — SDET with 2.5+ years of experience making sure other people's software does what it's supposed to do, which turns out to be a full-time job. Currently pursuing an MS in Computer Science at Florida International University, where the weather is excellent and the distributed systems coursework is humbling.

This project exists at the intersection of two things I care about: **making QA accessible** (not everyone has the time or resources to write a full test suite), and **building tools that use AI as a genuine accelerator** rather than a party trick.

If this tool saved you an hour, made you smile, or generated a test case that actually caught a real bug — that's the whole point.

GitHub: [github.com/AniruddhaTayade](https://github.com/AniruddhaTayade) · Project: [qa-agent](https://github.com/AniruddhaTayade/qa-agent)

---

*P.S. — This README was written by a human. The test cases were written by an AI. Make of that what you will.*
