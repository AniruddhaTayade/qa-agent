import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
import os
import json
import hmac

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
import hashlib
import secrets
import time
import ipaddress
from typing import Optional, Set
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

from services.scraper import scrape_page
from services.openai_service import generate_all_tests
from services.playwright_runner import run_tests_streaming

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# ---------------------------------------------------------------------------
# Token store (in-memory, single-use, 60-second TTL)
# ---------------------------------------------------------------------------
_used_tokens: Set[str] = set()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="QA Test Agent API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow all origins in dev; restrict to FRONTEND_URL in prod
_cors_origins = [FRONTEND_URL] if FRONTEND_URL else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Private IP ranges for SSRF protection
# ---------------------------------------------------------------------------
_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]

_BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------

def validate_url(url: str) -> Optional[str]:
    if len(url) > 500:
        return "URL exceeds maximum length of 500 characters"

    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL format"

    if parsed.scheme not in ("http", "https"):
        return "URL must use http or https scheme"

    hostname = parsed.hostname
    if not hostname:
        return "URL has no valid hostname"

    if hostname.lower() in _BLOCKED_HOSTS:
        return f"Hostname '{hostname}' is not permitted"

    try:
        addr = ipaddress.ip_address(hostname)
        for net in _PRIVATE_NETWORKS:
            if addr in net:
                return f"Private or reserved IP address '{hostname}' is not allowed (SSRF protection)"
    except ValueError:
        pass  # domain name — OK

    return None


def _sign(payload: str, expiry: int) -> str:
    return hmac.new(
        SECRET_KEY.encode(),
        f"{payload}:{expiry}".encode(),
        hashlib.sha256,
    ).hexdigest()


def generate_token() -> str:
    payload = secrets.token_hex(32)
    expiry = int(time.time()) + 60
    sig = _sign(payload, expiry)
    return f"{payload}:{expiry}:{sig}"


def consume_token(token: str) -> Optional[str]:
    """Validate and mark token as used. Returns error string, or None on success."""
    try:
        payload, expiry_str, sig = token.split(":", 2)
    except ValueError:
        return "Malformed token"

    try:
        expiry = int(expiry_str)
    except ValueError:
        return "Malformed token expiry"

    expected_sig = _sign(payload, expiry)
    if not hmac.compare_digest(sig, expected_sig):
        return "Invalid token signature"

    if time.time() > expiry:
        return "Token has expired"

    if payload in _used_tokens:
        return "Token has already been used"

    _used_tokens.add(payload)
    return None


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/token")
@limiter.limit("20/minute")
async def get_token(request: Request):
    return {"token": generate_token()}


@app.get("/api/run-tests")
@limiter.limit("5/minute")
async def run_tests(
    request: Request,
    url: str,
    token: Optional[str] = None,
    x_scan_token: Optional[str] = Header(default=None),
):
    # Resolve token from header or query param
    scan_token = x_scan_token or token

    # Missing token is detectable before streaming starts — keep as HTTP 401
    if not scan_token:
        raise HTTPException(status_code=401, detail="Missing scan token. Call /api/token first.")

    async def event_stream():
        # ── Token validation (inside stream so error reaches frontend via SSE) ──
        token_error = consume_token(scan_token)
        if token_error:
            yield _sse({"type": "error", "message": token_error})
            return

        # ── URL validation ────────────────────────────────────────────────────
        url_error = validate_url(url)
        if url_error:
            yield _sse({"type": "error", "message": url_error})
            return

        try:
            yield _sse({"type": "status", "message": "Scraping page structure…"})
            page_structure = await scrape_page(url)

            yield _sse({"type": "status", "message": "Generating test cases with AI…"})
            raw_tests = await generate_all_tests(page_structure, url)

            if not raw_tests:
                yield _sse({"type": "error", "message": "AI returned no test cases. Try a different URL."})
                return

            # Emit all tests as queued so the UI renders all cards immediately
            for tc in raw_tests:
                yield _sse({
                    "type": "test-update",
                    "test": {
                        "id":             tc.get("id", ""),
                        "status":         "queued",
                        "title":          tc.get("title", ""),
                        "category":       tc.get("category", "ui"),
                        "steps":          tc.get("steps", []),
                        "expectedResult": tc.get("expectedResult", ""),
                        "description":    tc.get("description", ""),
                        "playwrightCode": tc.get("playwrightCode", ""),
                        "error":          None,
                        "duration":       0,
                    },
                })

            # Execute tests and stream results
            passed = 0
            failed = 0
            async for event in run_tests_streaming(raw_tests):
                test_id = event["test_id"]
                if event["action"] == "running":
                    yield _sse({
                        "type": "test-update",
                        "test": {"id": test_id, "status": "running"},
                    })
                elif event["action"] == "result":
                    evt_status = event["status"]
                    if evt_status == "passed":
                        passed += 1
                    else:
                        failed += 1
                    yield _sse({
                        "type": "test-update",
                        "test": {
                            "id":       test_id,
                            "status":   evt_status,
                            "duration": event["duration"],
                            "error":    event.get("error"),
                        },
                    })

            yield _sse({
                "type": "complete",
                "summary": {"total": len(raw_tests), "passed": passed, "failed": failed},
                "tests": raw_tests,
            })

        except Exception as exc:
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
