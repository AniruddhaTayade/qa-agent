import os
import re
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional

from openai import AsyncOpenAI

from analyzers.abstract_analyzer import AbstractTestGenerator
from analyzers import UITestGenerator, FormTestGenerator, NavigationTestGenerator, APITestGenerator

logger = logging.getLogger(__name__)

# Confirm the key is present at import time (value never logged)
if os.getenv("OPENAI_API_KEY"):
    logger.info("OpenAI API key loaded successfully")
else:
    logger.warning("OPENAI_API_KEY is not set — API calls will fail")

_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


CATEGORY_SYSTEM_PROMPT = """\
You are a QA automation expert. Generate test cases for the {category} category of a website.
{hint}

Return ONLY a valid JSON array — no markdown, no code fences, raw JSON only.
Generate 3–4 test cases maximum.

Each object must have exactly these fields:
  id             — string like "{category}_1", "{category}_2"
  category       — "{category}"
  title          — short descriptive string
  description    — one sentence
  steps          — array of strings describing each test step
  expectedResult — string describing the expected outcome
  playwrightCode — a complete self-contained async Python function.
                   Signature must be exactly: async def run_test(page):
                   The first line of the function body MUST navigate to the target URL.
                   No import statements inside the function.\
"""

VALIDATE_PROMPT = """\
Validate and fix this playwright-python async function.
Ensure it:
- Uses only playwright.async_api page methods
- Has no import statements
- Has exactly this signature: async def run_test(page):
- Will not raise syntax errors
Return ONLY the fixed function code as a plain string, no markdown.\
"""


def clean_json_response(text: str) -> str:
    """Strip markdown code fences from an OpenAI JSON response."""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


def _strip_code_fences(text: str) -> str:
    """Strip markdown code fences from a Python code response."""
    text = re.sub(r'```python\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


async def generate_category_tests(
    generator: AbstractTestGenerator,
    url: str,
) -> List[Dict[str, Any]]:
    category = generator.get_category()
    hint = generator.get_context_hint()
    relevant_data = generator.get_relevant_data()

    system_prompt = CATEGORY_SYSTEM_PROMPT.format(category=category, hint=hint)
    if category == "api":
        system_prompt += (
            "\n\nIMPORTANT: Use Python playwright syntax only. "
            "The correct method is page.wait_for_response() not page.waitForResponse(). "
            "Use page.wait_for_selector() not page.waitForSelector(). "
            "All methods use snake_case not camelCase. "
            "page.url is a property, not a method — write page.url not page.url(). "
            "For API tests, prefer checking DOM elements that appear after data loads "
            "rather than intercepting network responses, since many modern SPAs do not "
            "have traditional REST API calls visible to Playwright."
        )
    data_str = json.dumps(relevant_data, indent=2)[:4000]
    user_content = f"Website URL: {url}\n\nPage data:\n{data_str}"

    logger.info("Generating [%s] test cases...", category)
    try:
        response = await get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_content},
            ],
            max_tokens=4096,
            temperature=0.3,
        )
        logger.info("[%s] test cases generated successfully", category)
        content = response.choices[0].message.content
    except Exception as e:
        logger.error("[%s] generation failed: %s", category, type(e).__name__)
        raise

    cleaned = clean_json_response(content)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("[%s] JSON parse error: %s", category, exc)
        raise


async def validate_playwright_code(code: str) -> str:
    response = await get_client().chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": VALIDATE_PROMPT},
            {"role": "user",   "content": code},
        ],
        max_tokens=4096,
        temperature=0.3,
    )
    return _strip_code_fences(response.choices[0].message.content)


async def generate_all_tests(
    page_structure: Dict[str, Any],
    url: str,
) -> List[Dict[str, Any]]:
    generators = [
        UITestGenerator(page_structure),
        FormTestGenerator(page_structure),
        NavigationTestGenerator(page_structure),
        APITestGenerator(page_structure),
    ]

    # Pass 1 — run all 4 generators sequentially to avoid rate limit / auth errors
    all_tests: List[Dict[str, Any]] = []
    for g in generators:
        try:
            result = await generate_category_tests(g, url)
            if isinstance(result, list):
                all_tests.extend(result)
        except Exception as e:
            logger.error("Generator failed for [%s]: %s", g.get_category(), type(e).__name__)

    all_tests = all_tests[:15]

    # Pass 2 — validate playwright code for tests with > 5 steps
    async def maybe_fix(tc: Dict[str, Any]) -> Dict[str, Any]:
        if len(tc.get("steps", [])) > 5 and tc.get("playwrightCode"):
            try:
                fixed = await validate_playwright_code(tc["playwrightCode"])
                return {**tc, "playwrightCode": fixed}
            except Exception:
                pass
        return tc

    all_tests = list(await asyncio.gather(*[maybe_fix(tc) for tc in all_tests]))
    return all_tests
