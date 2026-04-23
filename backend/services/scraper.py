import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any


async def scrape_page(url: str) -> Dict[str, Any]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    meta_description = ""
    meta_keywords = ""
    for meta in soup.find_all("meta"):
        name = meta.get("name", "").lower()
        if name == "description":
            meta_description = meta.get("content", "")
        elif name == "keywords":
            meta_keywords = meta.get("content", "")

    links = []
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        if text:
            links.append({"href": a["href"], "text": text})

    forms = []
    for form in soup.find_all("form"):
        inputs = []
        for inp in form.find_all(["input", "textarea", "select"]):
            label_text = ""
            inp_id = inp.get("id")
            if inp_id:
                label = soup.find("label", {"for": inp_id})
                if label:
                    label_text = label.get_text(strip=True)
            inputs.append({
                "type": inp.get("type", "text"),
                "name": inp.get("name", ""),
                "placeholder": inp.get("placeholder", ""),
                "label": label_text,
            })
        buttons = []
        for btn in form.find_all(["button", "input"]):
            btn_type = btn.get("type", "")
            if btn_type in ("submit", "button", "reset") or btn.name == "button":
                buttons.append({
                    "text": btn.get_text(strip=True) or btn.get("value", ""),
                    "type": btn_type or "button",
                })
        forms.append({"inputs": inputs, "buttons": buttons})

    headings = []
    for tag in ["h1", "h2", "h3", "h4"]:
        for h in soup.find_all(tag):
            text = h.get_text(strip=True)
            if text:
                headings.append({"level": tag, "text": text})

    standalone_buttons = []
    for btn in soup.find_all("button"):
        if not btn.find_parent("form"):
            text = btn.get_text(strip=True)
            if text:
                standalone_buttons.append({
                    "text": text,
                    "type": btn.get("type", "button"),
                })

    scripts = [s["src"] for s in soup.find_all("script", src=True)]

    return {
        "title": title,
        "meta_description": meta_description,
        "meta_keywords": meta_keywords,
        "links": links[:50],
        "forms": forms,
        "headings": headings,
        "buttons": standalone_buttons,
        "scripts": scripts[:20],
    }
