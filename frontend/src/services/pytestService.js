function toSync(code = '') {
  return code
    .replace(/async def run_test\(page\):/g, 'def run_test(page):')
    .replace(/\bawait\s+/g, '')
}

function safeId(id = 'test') {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

export function generateAndDownloadPytest(tests) {
  const lines = [
    'import pytest',
    'from playwright.sync_api import sync_playwright, Page',
    '',
    '',
    "@pytest.fixture(scope='module')",
    'def browser_page():',
    "    with sync_playwright() as p:",
    "        browser = p.chromium.launch(headless=True)",
    "        page = browser.new_page()",
    "        yield page",
    "        browser.close()",
    '',
    '',
  ]

  for (const test of tests) {
    const fid = safeId(test.id)
    const desc = (test.description || '').replace(/"""/g, "'''")
    const syncCode = toSync(test.playwrightCode || '')

    // Extract body lines after def run_test(page):
    const bodyLines = []
    let inBody = false
    for (const line of syncCode.split('\n')) {
      if (/def run_test\s*\(page\)\s*:/.test(line)) {
        inBody = true
        continue
      }
      if (inBody) {
        bodyLines.push('    ' + line)
      }
    }

    lines.push(`def test_${fid}(browser_page: Page):`)
    lines.push(`    """${desc}"""`)
    lines.push(...(bodyLines.length ? bodyLines : ['    pass']))
    lines.push('')
    lines.push('')
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = 'test_suite.py'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
