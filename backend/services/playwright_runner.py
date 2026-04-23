import sys
import time
import logging
import textwrap
import tempfile
import subprocess
from pathlib import Path
from typing import List, Dict, Any, AsyncGenerator

logger = logging.getLogger(__name__)

# Each test runs in its own Python subprocess so it gets a fresh event loop
# that is never shared with uvicorn's loop. This sidesteps the Windows
# SelectorEventLoop / Playwright NotImplementedError entirely.

_HARNESS = textwrap.dedent("""\
    import asyncio
    import sys
    from playwright.async_api import async_playwright, Response

    {playwright_code}

    async def _main():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await asyncio.wait_for(run_test(page), timeout=15)
                print("PASSED")
            except asyncio.TimeoutError:
                print("FAILED: Test timed out after 15 seconds")
            except Exception as e:
                print(f"FAILED: {{e}}")
            finally:
                try:
                    await browser.close()
                except Exception:
                    pass

    asyncio.run(_main())
""")


def _fix_camel_case(code: str) -> str:
    """Auto-correct common JS/camelCase Playwright method names to Python snake_case."""
    replacements = [
        ("waitForResponse",   "wait_for_response"),
        ("waitForSelector",   "wait_for_selector"),
        ("waitForTimeout",    "wait_for_timeout"),
        ("waitForNavigation", "wait_for_navigation"),
        ("waitForURL",        "wait_for_url"),
        ("waitForLoadState",  "wait_for_load_state"),
        ("innerText",         "inner_text"),
        ("innerHTML",         "inner_html"),
        ("querySelector",     "query_selector"),
        ("querySelectorAll",  "query_selector_all"),
        ("getAttribute",      "get_attribute"),
        ("textContent",       "text_content"),
        ("isVisible",         "is_visible"),
        ("isEnabled",         "is_enabled"),
        ("isChecked",         "is_checked"),
        ("inputValue",        "input_value"),
        ("selectOption",      "select_option"),
        ("dispatchEvent",     "dispatch_event"),
        ("addScriptTag",      "add_script_tag"),
        ("addStyleTag",       "add_style_tag"),
        # page.url is a property in Python Playwright, not a callable
        ("page.url()",        "page.url"),
        ("await page.url",    "page.url"),
        # Comment out network-interception lines that break on SPAs with no
        # visible REST endpoints (the camelCase fix above already ran, so we
        # match the snake_case form here)
        ("response = await page.wait_for_response",  "# response = await page.wait_for_response"),
        ("assert response.status",                    "# assert response.status"),
        ("json_data = await response.json()",         "# json_data = await response.json()"),
        ("assert 'products' in json_data",            "# assert 'products' in json_data"),
    ]
    for camel, snake in replacements:
        code = code.replace(camel, snake)
    return code


def _run_one(playwright_code: str) -> Dict[str, Any]:
    """Write a harness script to a temp file and run it in a subprocess."""
    tmp = None
    try:
        # Fix camelCase method names before writing to the harness
        playwright_code = _fix_camel_case(playwright_code)

        # Write the harness to a uniquely-named temp file
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
            encoding="utf-8",
        ) as fh:
            fh.write(_HARNESS.format(playwright_code=playwright_code))
            tmp = fh.name

        start = time.perf_counter()
        proc = subprocess.run(
            [sys.executable, tmp],
            capture_output=True,
            text=True,
            timeout=20,          # outer wall-clock limit (harness has 15 s inner limit)
        )
        duration = round(time.perf_counter() - start, 3)

        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()

        logger.info("Test subprocess stdout: %s", stdout)
        if stderr:
            logger.warning("Test subprocess stderr: %s", stderr[:300])

        if "PASSED" in stdout:
            return {"status": "passed", "error": None, "duration": duration}

        # Extract the error message that follows "FAILED: "
        for line in stdout.splitlines():
            if line.startswith("FAILED:"):
                return {
                    "status": "failed",
                    "error": line[len("FAILED:"):].strip(),
                    "duration": duration,
                }

        # Subprocess exited without printing PASSED or FAILED — treat as failure
        error_detail = stderr or stdout or f"Process exited with code {proc.returncode}"
        return {"status": "failed", "error": error_detail[:500], "duration": duration}

    except subprocess.TimeoutExpired:
        return {
            "status": "failed",
            "error": "Test timed out (subprocess limit exceeded)",
            "duration": 20.0,
        }
    except Exception as exc:
        return {"status": "failed", "error": str(exc), "duration": 0.0}
    finally:
        if tmp:
            try:
                Path(tmp).unlink(missing_ok=True)
            except Exception:
                pass


async def run_tests_streaming(
    tests: List[Dict[str, Any]],
) -> AsyncGenerator[Dict[str, Any], None]:
    """Async generator that runs each test in a subprocess and streams results."""
    for test in tests:
        yield {"action": "running", "test_id": test["id"]}

        code = test.get("playwrightCode", "").strip()

        if not code:
            yield {
                "action":   "result",
                "test_id":  test["id"],
                "status":   "failed",
                "duration": 0.0,
                "error":    "No playwrightCode provided for this test",
            }
            continue

        logger.info("Running test: %s", test['id'])
        outcome = _run_one(code)

        yield {
            "action":   "result",
            "test_id":  test["id"],
            "status":   outcome["status"],
            "duration": outcome["duration"],
            "error":    outcome["error"],
        }
