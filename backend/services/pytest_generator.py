import re
from typing import List, Dict, Any


def _to_sync(code: str) -> str:
    code = re.sub(r"async def run_test\(page\):", "def run_test(page):", code)
    code = re.sub(r"\bawait\s+", "", code)
    return code


def _safe_id(raw_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", raw_id)


def generate_pytest_file(tests: List[Dict[str, Any]]) -> str:
    lines = [
        "import pytest",
        "from playwright.sync_api import sync_playwright, Page",
        "",
        "",
        "@pytest.fixture(scope='module')",
        "def browser_page():",
        "    with sync_playwright() as p:",
        "        browser = p.chromium.launch(headless=True)",
        "        page = browser.new_page()",
        "        yield page",
        "        browser.close()",
        "",
        "",
    ]

    for test in tests:
        test_id = _safe_id(test.get("id", "test"))
        description = test.get("description", "").replace('"""', "'''")
        sync_code = _to_sync(test.get("playwrightCode", ""))

        body_lines: List[str] = []
        in_body = False
        for line in sync_code.splitlines():
            if re.match(r"\s*def run_test\(page\):", line):
                in_body = True
                continue
            if in_body:
                body_lines.append("    " + line)

        if not body_lines:
            body_lines = ["    pass"]

        lines.append(f"def test_{test_id}(browser_page: Page):")
        lines.append(f'    """{description}"""')
        lines.extend(body_lines)
        lines.append("")
        lines.append("")

    return "\n".join(lines)
