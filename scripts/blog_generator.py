#!/usr/bin/env python3
"""
HMR Blog Generator — Autonomous Content Pipeline
================================================
Ingests English RSS feeds → maps to HMR Pillars → deduplicates →
generates localized Persian advisory articles via OpenRouter API →
generates hero images via Flux → writes to HMR-Astro content collection →
publishes to Telegram channel.

Usage:
    python blog_generator.py                  # full run (fetch → generate → write → telegram)
    python blog_generator.py --dry-run        # fetch + classify + dedup; no generation
    python blog_generator.py --single URL     # process a single RSS item by its link
    python blog_generator.py --max N          # limit how many new articles to generate
    python blog_generator.py --skip-image     # skip image generation
    python blog_generator.py --skip-telegram  # skip Telegram posting

Environment:
    OPENROUTER_API_KEY   — required; your OpenRouter API key.
    TELEGRAM_BOT_TOKEN   — Telegram bot token (from BotFather).
    TELEGRAM_CHANNEL_ID  — Telegram channel ID (e.g. -1004409519041).
    HMR_BLOG_OUT_DIR     — optional; defaults to ../HMR-Astro/src/content/blog/
    HMR_IMG_OUT_DIR      — optional; defaults to ../HMR-Astro/public/blog/images/
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import feedparser
import requests

# ── Optional: faster string similarity ──────────────────────────────────
try:
    from Levenshtein import ratio as levenshtein_ratio  # C-accelerated
except ImportError:
    def levenshtein_ratio(a: str, b: str) -> float:
        """Normalized Levenshtein similarity (0–1)."""
        if not a and not b:
            return 1.0
        if not a or not b:
            return 0.0
        m, n = len(a), len(b)
        prev = list(range(n + 1))
        curr = [0] * (n + 1)
        for i in range(1, m + 1):
            curr[0] = i
            for j in range(1, n + 1):
                cost = 0 if a[i - 1] == b[j - 1] else 1
                curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
            prev, curr = curr, prev
        return 1.0 - (prev[n] / max(m, n))


# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

LOG = logging.getLogger("hmr-blog-gen")

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

# Published topics registry — prevents near-duplicate articles
PUBLISHED_TOPICS_PATH = SCRIPT_DIR / "published_topics.json"

# Output: Astro content collection directory
DEFAULT_OUT_DIR = PROJECT_ROOT / "HMR-Astro" / "src" / "content" / "blog"

# Output: Hero images directory (served as /blog/images/ on the site)
DEFAULT_IMG_DIR = PROJECT_ROOT / "HMR-Astro" / "public" / "blog" / "images"

# RSS sources — authoritative English-language mobile tech outlets
RSS_SOURCES: List[Dict[str, str]] = [
    {
        "name": "GSMArena",
        "url": "https://www.gsmarena.com/rss-news-reviews.php3",
        "lang": "en",
    },
    {
        "name": "Android Authority",
        "url": "https://www.androidauthority.com/feed",
        "lang": "en",
    },
    {
        "name": "9to5Mac",
        "url": "https://9to5mac.com/feed/",
        "lang": "en",
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "lang": "en",
    },
    {
        "name": "NotebookCheck",
        "url": "https://www.notebookcheck.net/News.19.0.html?feed=rss",
        "lang": "en",
    },
    {
        "name": "XDA Developers",
        "url": "https://www.xda-developers.com/feed/",
        "lang": "en",
    },
    {
        "name": "TechRadar",
        "url": "https://www.techradar.com/rss",
        "lang": "en",
    },
    {
        "name": "9to5Google",
        "url": "https://9to5google.com/feed/",
        "lang": "en",
    },
]

# HMR Five Product Pillars — with keyword mapping for auto-classification
PILLARS: Dict[str, Dict] = {
    "pillar-1-new-phone-guide": {
        "title_en": "New-Phone Buying Guide",
        "title_fa": "راهنمای خرید گوشی نو",
        "keywords": [
            "launch", "announced", "release", "price", "new phone", "new smartphone",
            "buying guide", "best phone", "top phone", "flagship", "mid-range",
            "budget phone", "vs", "comparison", "review", "hands-on", "worth buying",
            "specs", "specifications", "camera", "battery", "display", "performance",
            "chipset", "snapdragon", "dimensity", "exynos", "a18", "a17", "tensor",
        ],
    },
    "pillar-2-used-phone-guide": {
        "title_en": "Used-Phone Buying Guide + Fraud Detection",
        "title_fa": "راهنمای خرید گوشی دست‌دوم و تشخیص تقلب",
        "keywords": [
            "used phone", "second-hand", "refurbished", "pre-owned", "counterfeit",
            "fake", "clone", "scam", "fraud", "verify", "authentic", "genuine",
            "warranty", "check", "serial", "imei", "trade-in", "resale value",
        ],
    },
    "pillar-3-troubleshooting": {
        "title_en": "Hardware Troubleshooting & Fault Diagnosis",
        "title_fa": "عیب‌یابی و تشخیص خرابی سخت‌افزار",
        "keywords": [
            "fix", "repair", "broken", "issue", "problem", "bug", "defect",
            "not working", "error", "battery drain", "overheating", "screen",
            "charging", "won't turn on", "bootloop", "bricked", "water damage",
            "cracked", "diagnosis", "troubleshooting", "recall", "hardware failure",
        ],
    },
    "pillar-4-hardware-education": {
        "title_en": "Hardware Education",
        "title_fa": "آموزش سخت‌افزار",
        "keywords": [
            "explained", "guide", "how to", "what is", "tutorial", "understanding",
            "technology", "tech", "processor", "ram", "storage", "sensor",
            "display tech", "oled", "amoled", "lcd", "refresh rate", "5g",
            "wifi", "bluetooth", "nfc", "uwb", "usb-c", "lightning", "fast charging",
            "wireless charging", "ip rating", "waterproof", "gorilla glass",
        ],
    },
    "pillar-5-accessories": {
        "title_en": "Accessories Guidance",
        "title_fa": "راهنمای لوازم جانبی",
        "keywords": [
            "accessory", "accessories", "case", "cover", "screen protector",
            "charger", "cable", "power bank", "headphone", "earbuds", "earphone",
            "wireless earbuds", "smartwatch", "watch", "band", "strap",
            "dock", "stand", "mount", "car charger", "adapter", "dongle",
            "magsafe", "magsafe accessory", "galaxy buds", "airpods", "pixel buds",
        ],
    },
}

# Pillar keyword → pillar-id lookup (built once at startup)
_pillar_keyword_map: Optional[List[Tuple[str, str]]] = None

# Deduplication threshold
DEDUP_SIMILARITY_THRESHOLD: float = 0.70

# OpenRouter API
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "google/gemini-2.5-flash-lite"
OPENROUTER_IMAGE_MODEL = "black-forest-labs/flux.2-pro"

# Telegram Bot API
# Set via environment variables:
#   TELEGRAM_BOT_TOKEN=8804079260:AAG1RDI1puddVHh9hZtIWhrXY64wOXSeZ3g
#   TELEGRAM_CHANNEL_ID=-1004409519041
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "")

# Pillar-specific image styles for Flux prompts
PILLAR_IMAGE_STYLES: Dict[str, str] = {
    "pillar-1-new-phone-guide": (
        "sleek new flagship smartphone on a minimalist dark surface, premium product photography, "
        "dramatic studio rim lighting, shallow depth of field"
    ),
    "pillar-2-used-phone-guide": (
        "careful hands inspecting a used smartphone with magnifying glass, "
        "investigative mood, dark background with spotlight"
    ),
    "pillar-3-troubleshooting": (
        "smartphone with glowing blue circuit board diagnostic overlay, "
        "technical repair aesthetic, dark lab environment"
    ),
    "pillar-4-hardware-education": (
        "smartphone exploded view revealing internal components — chip, battery, sensors — "
        "floating apart on dark background, educational illustration style"
    ),
    "pillar-5-accessories": (
        "premium smartphone accessories arranged aesthetically — wireless earbuds, case, fast charger — "
        "flat lay on dark surface, cinematic lighting"
    ),
}

# Persian localization boilerplate injected into every prompt
IRAN_MARKET_CONTEXT = """
Iranian market context to weave in naturally where relevant:
- Price warnings in Toman (تومان) — mention extreme local markup vs global MSRP
- Sanction effects — limited official warranty, no Google services on some brands, import difficulties
- Network filtering — some cloud services blocked; VPN reliance; local alternatives (Snapp, Cafe Bazaar)
- Counterfeit spare parts rampant in local repair shops — advise on genuine part verification
- Currency fluctuation — USD/IRR volatility makes phone prices change weekly
- Local carriers: همراه اول, ایرانسل, رایتل — mention band compatibility when relevant
- Trade-in and installment purchase options (like دیجی‌کالا اعتباری) are important to Iranian buyers
"""


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════


def _normalize_text(s: str) -> str:
    """Normalize text for comparison: lowercase, strip accents, collapse whitespace."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[^\w\s]", "", s.lower())
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _build_pillar_keyword_map() -> List[Tuple[str, str]]:
    """Build a flat list of (keyword, pillar_id) sorted longest-first."""
    pairs: List[Tuple[str, str]] = []
    for pillar_id, cfg in PILLARS.items():
        for kw in cfg["keywords"]:
            pairs.append((kw.lower(), pillar_id))
    pairs.sort(key=lambda x: -len(x[0]))
    return pairs


def classify_pillar(title: str, summary: str = "") -> str:
    """
    Auto-classify an RSS item into one of the 5 HMR Pillars.
    Uses keyword-matching against title + summary.
    Falls back to pillar-1 (new phone guide) as default.
    """
    global _pillar_keyword_map
    if _pillar_keyword_map is None:
        _pillar_keyword_map = _build_pillar_keyword_map()

    text = f"{title} {summary}".lower()
    scores: Dict[str, int] = {}

    for kw, pid in _pillar_keyword_map:
        if kw in text:
            scores[pid] = scores.get(pid, 0) + len(kw)

    if not scores:
        return "pillar-1-new-phone-guide"

    return max(scores, key=scores.get)


def is_duplicate(candidate_title: str, published: List[Dict]) -> bool:
    """
    Check if a candidate title is a near-duplicate of any previously published article.
    Returns True if normalized similarity > DEDUP_SIMILARITY_THRESHOLD with any entry.
    """
    norm_candidate = _normalize_text(candidate_title)
    for entry in published:
        norm_existing = _normalize_text(entry.get("title", ""))
        sim = levenshtein_ratio(norm_candidate, norm_existing)
        if sim > DEDUP_SIMILARITY_THRESHOLD:
            LOG.info(
                "  ✗ DUPLICATE (%.0f%%): %r ≈ %r",
                sim * 100,
                candidate_title[:60],
                entry.get("title", "")[:60],
            )
            return True
    return False


def slugify(text: str, max_len: int = 60) -> str:
    """Create a URL-safe slug from text. Persian chars become their transliterated or hashed form."""
    ascii_count = sum(1 for ch in text if ord(ch) < 128)
    if ascii_count / max(len(text), 1) > 0.7:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
        return slug[:max_len].strip("-")

    h = hashlib.md5(text.encode("utf-8")).hexdigest()[:10]
    date_part = date.today().isoformat()
    return f"{date_part}-{h}"


def load_published_registry() -> List[Dict]:
    """Load (or create) the published topics JSON registry."""
    path = PUBLISHED_TOPICS_PATH
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except (json.JSONDecodeError, OSError) as exc:
            LOG.warning("Could not parse %s: %s — starting fresh", path, exc)
    with open(path, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)
    return []


def save_published_registry(registry: List[Dict]) -> None:
    """Persist the published topics JSON registry atomically."""
    path = PUBLISHED_TOPICS_PATH
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def fetch_rss_entries(source: Dict) -> List[Dict]:
    """Fetch and parse a single RSS feed. Returns list of normalized entries."""
    LOG.info("  Fetching %s…", source["name"])
    try:
        resp = requests.get(source["url"], timeout=30, headers={
            "User-Agent": "HMR-BlogBot/1.0 (hmrbot.com; RSS aggregator)",
        })
        resp.raise_for_status()
    except requests.RequestException as exc:
        LOG.error("  ✗ Failed to fetch %s: %s", source["name"], exc)
        return []

    feed = feedparser.parse(resp.content)
    entries: List[Dict] = []
    for item in feed.entries:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        link = (item.get("link") or "").strip()
        summary_raw = (item.get("summary") or item.get("description") or "").strip()
        summary = re.sub(r"<[^>]+>", "", summary_raw).strip()
        published = item.get("published") or item.get("pubDate") or ""
        entries.append({
            "title": title,
            "link": link,
            "summary": summary,
            "published": published,
            "source_name": source["name"],
        })
    LOG.info("    → Got %d entries", len(entries))
    return entries


def fetch_all_rss() -> List[Dict]:
    """Fetch all configured RSS feeds. Returns a combined list."""
    all_entries: List[Dict] = []
    for src in RSS_SOURCES:
        all_entries.extend(fetch_rss_entries(src))
    return all_entries


# ═══════════════════════════════════════════════════════════════════════════
# Image Generation (Flux via OpenRouter)
# ═══════════════════════════════════════════════════════════════════════════


def build_image_prompt(title: str, pillar_id: str) -> str:
    """Build an English image generation prompt for Flux."""
    style = PILLAR_IMAGE_STYLES.get(
        pillar_id,
        "professional smartphone photography, dark background, cinematic lighting"
    )

    return (
        f"Ultra-high-quality professional tech blog hero image: {style}. "
        f"Dark charcoal background, dramatic rim lighting, sharp focus, 16:9 landscape aspect ratio, "
        f"photorealistic, no text, no watermarks, no logos, commercial photography quality, 4K."
    )


def generate_image(
    prompt: str,
    api_key: str,
    slug: str,
    img_dir: Path,
) -> Optional[Path]:
    """
    Generate a hero image via OpenRouter Flux and save it locally.
    Returns the saved Path, or None on failure.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hmrbot.com",
        "X-Title": "HMR Blog Image Generator",
    }
    payload = {
        "model": OPENROUTER_IMAGE_MODEL,
        "messages": [{"role": "user", "content": prompt}],
    }

    LOG.info("  🎨 Generating image via Flux (%s)…", OPENROUTER_IMAGE_MODEL)
    try:
        resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=180)
    except requests.RequestException as exc:
        LOG.error("  ✗ Image API request failed: %s", exc)
        return None

    if resp.status_code != 200:
        LOG.error("  ✗ Image API HTTP %d: %s", resp.status_code, resp.text[:400])
        return None

    data = resp.json()

    # Extract image data — Flux returns in msg['images'], not msg['content']
    import base64 as _base64

    image_bytes: Optional[bytes] = None
    ext = "jpg"

    try:
        msg = data["choices"][0]["message"]

        # Primary: Flux/OpenRouter returns images in msg['images']
        images_list = msg.get("images") or []
        if images_list:
            img_entry = images_list[0]
            raw_url = img_entry.get("image_url", {}).get("url", "")
            if raw_url.startswith("data:"):
                # data:image/png;base64,<data>
                header, b64data = raw_url.split(",", 1)
                if "png" in header:
                    ext = "png"
                elif "webp" in header:
                    ext = "webp"
                image_bytes = _base64.b64decode(b64data)
            elif raw_url.startswith("http"):
                # Hosted URL — download it
                img_resp = requests.get(raw_url, timeout=120, headers={"User-Agent": "HMR-BlogBot/1.0"})
                img_resp.raise_for_status()
                ctype = img_resp.headers.get("Content-Type", "").lower()
                if "png" in ctype:
                    ext = "png"
                elif "webp" in ctype:
                    ext = "webp"
                image_bytes = img_resp.content

        # Fallback: check msg['content'] for URL or base64
        if not image_bytes:
            content = msg.get("content") or ""
            if isinstance(content, str) and content.strip():
                if content.strip().startswith("http"):
                    img_resp = requests.get(content.strip(), timeout=120)
                    image_bytes = img_resp.content
                elif content.startswith("data:"):
                    _, b64data = content.split(",", 1)
                    image_bytes = _base64.b64decode(b64data)
            elif isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        url = part.get("image_url", {}).get("url", "")
                        if url.startswith("data:"):
                            _, b64data = url.split(",", 1)
                            image_bytes = _base64.b64decode(b64data)
                        elif url.startswith("http"):
                            r = requests.get(url, timeout=120)
                            image_bytes = r.content
                        break

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        LOG.error("  ✗ Unexpected image API response: %s | %s", exc, str(data)[:300])
        return None

    if not image_bytes:
        LOG.error("  ✗ No image data found. choices[0]: %s", str(data.get("choices", [{}])[0])[:400])
        return None

    img_dir.mkdir(parents=True, exist_ok=True)
    out_path = img_dir / f"{slug}.{ext}"
    with open(out_path, "wb") as f:
        f.write(image_bytes)

    LOG.info("  ✓ Image saved: %s (%d KB)", out_path.name, len(image_bytes) // 1024)
    return out_path


# ═══════════════════════════════════════════════════════════════════════════
# Telegram Publishing
# ═══════════════════════════════════════════════════════════════════════════


def send_to_telegram(
    title: str,
    summary: str,
    pillar_fa: str,
    image_path: Optional[Path],
    article_url: str,
    bot_token: str,
    channel_id: str,
) -> bool:
    """
    Send the article to the HMR Telegram channel.
    Sends photo + caption if image exists, plain message otherwise.
    """
    if not bot_token or not channel_id:
        LOG.warning("  ⚠ Telegram credentials not set — skipping (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID)")
        return False

    base_url = f"https://api.telegram.org/bot{bot_token}"

    # Build Persian caption (HTML parse mode — safer than MarkdownV2 for Persian)
    pillar_tag = "#" + re.sub(r"[\s‌‍\-]+", "_", pillar_fa)

    caption = (
        f"📱 <b>{title}</b>\n\n"
        f"{summary[:380]}...\n\n"
        f'🔗 <a href="{article_url}">مطالعه کامل مقاله</a>\n'
        f'💬 <a href="https://hmrbot.com/ai">مشاور هوشمند موبایل همر</a>\n\n'
        f"{pillar_tag} #همر #موبایل #هوش_مصنوعی"
    )
    # Telegram caption hard limit: 1024 chars
    caption = caption[:1020]

    LOG.info("  📨 Sending to Telegram channel %s…", channel_id)
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            if image_path and image_path.exists():
                with open(image_path, "rb") as img_file:
                    resp = requests.post(
                        f"{base_url}/sendPhoto",
                        data={
                            "chat_id": channel_id,
                            "caption": caption,
                            "parse_mode": "HTML",
                        },
                        files={"photo": (image_path.name, img_file, "image/jpeg")},
                        timeout=60,
                    )
            else:
                resp = requests.post(
                    f"{base_url}/sendMessage",
                    json={
                        "chat_id": channel_id,
                        "text": caption,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": False,
                    },
                    timeout=30,
                )
        except requests.RequestException as exc:
            LOG.warning("  ✗ Telegram attempt %d/%d failed: %s", attempt, max_retries, exc)
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            LOG.error("  ✗ Telegram: all retries exhausted")
            return False

        if resp.status_code == 200:
            LOG.info("  ✓ Published to Telegram channel (attempt %d)", attempt)
            return True
        elif resp.status_code == 429:
            retry_after = int(resp.json().get("parameters", {}).get("retry_after", 2 ** attempt))
            LOG.warning("  ⏳ Telegram rate-limited — waiting %ds (attempt %d/%d)", retry_after, attempt, max_retries)
            time.sleep(retry_after)
        else:
            LOG.error("  ✗ Telegram HTTP %d: %s", resp.status_code, resp.text[:400])
            if attempt < max_retries:
                time.sleep(2 ** attempt)
            else:
                return False

    return False


# ═══════════════════════════════════════════════════════════════════════════
# OpenRouter Article Drafting
# ═══════════════════════════════════════════════════════════════════════════


def _build_drafting_prompt(entry: Dict, pillar_id: str) -> str:
    """Build the AI drafting prompt for a single RSS topic."""
    pillar = PILLARS[pillar_id]
    return f"""You are HMR (همر), an AI mobile-hardware advisor for the Iranian market.
Write a comprehensive, 100% original Persian-language advisory blog article based on the
English tech news below. DO NOT translate — write fully original Persian content that
uses the news as a starting point but is entirely re-written for an Iranian audience.

=== ENGLISH NEWS SOURCE ===
Title: {entry['title']}
Source: {entry['source_name']}
Summary: {entry['summary'][:800]}

=== ARTICLE REQUIREMENTS ===
1. LANGUAGE: Persian (فارسی) — natural, fluent, advisory tone. Not a translation.
2. PILLAR: {pillar['title_fa']} — focus the article on this HMR product pillar.
3. LOCALIZATION: Naturally weave in Iranian market context — Toman pricing,
   sanctions impact, local store availability (دیجی‌کالا, فروشگاه‌های تهران),
   currency volatility, network compatibility with Iranian carriers.
4. ADVISORY TONE: Advise, never decide. Use phrases like "پیشنهاد می‌کنیم بررسی کنید"
   and "توصیه می‌شود" NOT "باید بخرید" or "حتماً تهیه کنید".
5. HONESTY: If a spec or price is uncertain, say so. Never fabricate numbers.
6. STRUCTURE:
   - Catchy Persian title (< 80 chars)
   - Opening paragraph: why this matters to Iranian users
   - Main body: analysis with local context
   - Practical tips or checklist (where relevant)
   - Closing advisory note
7. LENGTH: Minimum 600 words in Persian.
8. CTA: End with this exact block (translate naturally but keep the URL):

---
💬 **با همر مشورت کنید**
سوالی در مورد خرید، عیب‌یابی یا مشخصات گوشی دارید؟
همین حالا از مشاور هوشمند موبایل بپرسید:
🔗 [https://hmrbot.com/ai](https://hmrbot.com/ai)
---

{IRAN_MARKET_CONTEXT}

=== OUTPUT FORMAT ===
Return ONLY the article content in Persian (no YAML, no English meta-instructions).
The first line MUST be the Persian title (no markdown heading markers on the title line).
"""


def generate_article(entry: Dict, pillar_id: str, api_key: str) -> Optional[str]:
    """
    Generate a Persian article via OpenRouter API (Gemini Flash-Lite).
    Returns the raw Persian Markdown text, or None on failure.
    """
    prompt = _build_drafting_prompt(entry, pillar_id)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hmrbot.com",
        "X-Title": "HMR Blog Generator",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert Persian-language tech content writer for HMR (همر), "
                    "an AI mobile-hardware advisory chatbot for the Iranian market. "
                    "Your writing is accurate, honest, localized, and advisory — never decisional. "
                    "You write 100% original Persian articles, never translating from English."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 4096,
        "top_p": 0.95,
    }

    LOG.info("  ⏳ Generating article via OpenRouter (%s)…", OPENROUTER_MODEL)
    try:
        resp = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        LOG.error("  ✗ OpenRouter request failed: %s", exc)
        return None

    if resp.status_code != 200:
        LOG.error("  ✗ OpenRouter HTTP %d: %s", resp.status_code, resp.text[:400])
        return None

    data = resp.json()
    try:
        article_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        LOG.error("  ✗ Unexpected API response structure: %s", exc)
        return None

    LOG.info("  ✓ Generated %d chars", len(article_text))
    return article_text.strip()


def extract_title_and_body(raw_article: str) -> Tuple[str, str]:
    """
    Parse the generated article into title and body.
    First meaningful line is the title; rest is body.
    """
    lines = raw_article.strip().split("\n")
    title = ""
    body_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith("```"):
            title = stripped.strip('"').strip("'").strip("«").strip("»").strip()
            body_start = i + 1
            break

    body = "\n".join(lines[body_start:]).strip()
    return title, body


# ═══════════════════════════════════════════════════════════════════════════
# Astro Content Output
# ═══════════════════════════════════════════════════════════════════════════


def write_astro_article(
    title: str,
    body: str,
    pillar_id: str,
    out_dir: Path,
    source_entry: Dict,
    hero_image: Optional[Path] = None,
) -> Optional[Path]:
    """
    Write a single article as an Astro content collection Markdown file
    with validated YAML frontmatter.
    """
    pillar = PILLARS[pillar_id]
    today = date.today().isoformat()

    slug = slugify(title)
    file_path = out_dir / f"{slug}.md"

    # Persian tags (matches pillar for display in blog UI)
    fa_tag_map = {
        "pillar-1-new-phone-guide": ["راهنمای خرید", "گوشی نو", "مقایسه گوشی"],
        "pillar-2-used-phone-guide": ["گوشی دست دوم", "تشخیص تقلب", "خرید مطمئن"],
        "pillar-3-troubleshooting": ["عیب‌یابی", "تعمیر گوشی", "مشکل سخت‌افزار"],
        "pillar-4-hardware-education": ["آموزش", "سخت‌افزار موبایل", "تکنولوژی"],
        "pillar-5-accessories": ["لوازم جانبی", "اکسسوری گوشی", "شارژر"],
    }
    tags = [pillar["title_fa"]] + fa_tag_map.get(pillar_id, [])[:3]

    # Summary: first ~180 chars of body, trimmed to sentence boundary
    summary_text = body[:200].strip()
    if len(summary_text) >= 180:
        for sep in [".", "؟", "!", "\n"]:
            idx = summary_text[:160].rfind(sep)
            if idx > 60:
                summary_text = summary_text[: idx + 1]
                break
        else:
            summary_text = summary_text[:157] + "…"

    # Escape YAML-unsafe characters
    title_yaml = title.replace('"', '\\"')
    summary_yaml = summary_text.strip().replace('"', '\\"')

    # Hero image web path (served from /public/blog/images/)
    hero_image_web = f"/blog/images/{hero_image.name}" if hero_image else ""

    description_yaml = summary_yaml[:160] if summary_yaml else title_yaml

    frontmatter = f"""---
title: "{title_yaml}"
pubDate: {today}
pillar: "{pillar['title_fa']}"
tags: {json.dumps(tags, ensure_ascii=False)}
description: "{description_yaml}"
summary: "{summary_yaml}"
source: "{source_entry['link']}"
sourceName: "{source_entry['source_name']}"
heroImage: "{hero_image_web}"
---"""

    content = f"{frontmatter}\n\n{body}\n"

    out_dir.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    LOG.info("  ✓ Wrote article: %s", file_path.name)
    return file_path


# ═══════════════════════════════════════════════════════════════════════════
# Main Pipeline
# ═══════════════════════════════════════════════════════════════════════════


def run_pipeline(
    api_key: str,
    out_dir: Path,
    img_dir: Path,
    *,
    dry_run: bool = False,
    max_articles: int = 3,
    single_url: Optional[str] = None,
    skip_image: bool = False,
    skip_telegram: bool = False,
) -> Dict:
    """
    Execute the full blog generation pipeline.
    Returns a summary dict with counts.
    """
    summary = {
        "fetched": 0,
        "classified": 0,
        "duplicates_skipped": 0,
        "generated": 0,
        "images_generated": 0,
        "written": 0,
        "telegram_sent": 0,
        "errors": 0,
    }

    # ── 0. Load registry ──
    registry = load_published_registry()
    LOG.info("Registry has %d published topics", len(registry))

    # ── 1. Fetch RSS ──
    LOG.info("═" * 60)
    LOG.info("STEP 1: Fetching RSS feeds (%d sources)…", len(RSS_SOURCES))
    if single_url:
        all_feeds = fetch_all_rss()
        entries = [e for e in all_feeds if e["link"] == single_url]
        if not entries:
            LOG.error("No RSS entry found for URL: %s", single_url)
            return summary
    else:
        entries = fetch_all_rss()
    summary["fetched"] = len(entries)
    LOG.info("Total entries fetched: %d", len(entries))

    # ── 2. Classify + Deduplicate ──
    LOG.info("═" * 60)
    LOG.info("STEP 2: Classifying & deduplicating…")
    candidates: List[Tuple[Dict, str]] = []
    for entry in entries:
        pillar_id = classify_pillar(entry["title"], entry["summary"])
        summary["classified"] += 1

        if is_duplicate(entry["title"], registry):
            summary["duplicates_skipped"] += 1
            continue

        candidates.append((entry, pillar_id))
        LOG.info("  ✓ %s → %s", entry["title"][:70], PILLARS[pillar_id]["title_en"])

    LOG.info(
        "Candidates after dedup: %d (skipped %d duplicates)",
        len(candidates),
        summary["duplicates_skipped"],
    )

    if dry_run:
        LOG.info("DRY RUN — stopping before generation.")
        return summary

    # ── 3. Generate articles ──
    LOG.info("═" * 60)
    LOG.info("STEP 3: Generating articles + images → publishing to Telegram…")
    generated_count = 0

    for entry, pillar_id in candidates:
        if generated_count >= max_articles:
            LOG.info("  Reached max_articles limit (%d)", max_articles)
            break

        LOG.info("─" * 50)
        LOG.info("Topic: %s", entry["title"][:80])
        pillar = PILLARS[pillar_id]

        # 3a. Generate Persian article
        raw = generate_article(entry, pillar_id, api_key)
        if raw is None:
            summary["errors"] += 1
            continue

        title, body = extract_title_and_body(raw)
        word_count = len(body.split()) if body else 0
        if not body or word_count < 200:
            LOG.warning("  ✗ Article too short (%d words); skipping (min: 200)", word_count)
            summary["errors"] += 1
            continue

        summary["generated"] += 1
        slug = slugify(title)

        # 3b. Generate hero image
        hero_image: Optional[Path] = None
        if not skip_image:
            img_prompt = build_image_prompt(entry["title"], pillar_id)
            hero_image = generate_image(img_prompt, api_key, slug, img_dir)
            if hero_image:
                summary["images_generated"] += 1
            time.sleep(2)  # Gentle rate-limit between API calls

        # 3c. Write Astro article file
        file_path = write_astro_article(title, body, pillar_id, out_dir, entry, hero_image)
        if file_path:
            summary["written"] += 1
            registry.append({
                "title": entry["title"],
                "original_link": entry["link"],
                "slug": file_path.stem,
                "pillar": pillar_id,
                "date": date.today().isoformat(),
            })
            generated_count += 1

            # 3d. Send to Telegram
            if not skip_telegram:
                article_url = f"https://hmrbot.com/blog/{file_path.stem}"
                sent = send_to_telegram(
                    title=title,
                    summary=body[:400],
                    pillar_fa=pillar["title_fa"],
                    image_path=hero_image,
                    article_url=article_url,
                    bot_token=TELEGRAM_BOT_TOKEN,
                    channel_id=TELEGRAM_CHANNEL_ID,
                )
                if sent:
                    summary["telegram_sent"] += 1

        # Rate-limit between articles
        if generated_count < max_articles:
            time.sleep(3)

    # ── 4. Persist registry ──
    save_published_registry(registry)
    LOG.info("Registry saved (%d total entries)", len(registry))

    return summary


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════


def main() -> None:
    # Fix Windows terminal encoding for Unicode output
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="HMR Blog Generator — RSS → Persian Article → Image → Telegram Pipeline",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch + classify + dedup only; do not generate articles.",
    )
    parser.add_argument(
        "--single",
        metavar="URL",
        help="Process a single RSS item by its link URL.",
    )
    parser.add_argument(
        "--max",
        type=int,
        default=3,
        metavar="N",
        help="Maximum number of new articles to generate (default: 3).",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help=f"Output directory for Astro blog Markdown (default: {DEFAULT_OUT_DIR}).",
    )
    parser.add_argument(
        "--img-dir",
        type=Path,
        default=DEFAULT_IMG_DIR,
        help=f"Output directory for hero images (default: {DEFAULT_IMG_DIR}).",
    )
    parser.add_argument(
        "--api-key",
        help="OpenRouter API key (or set OPENROUTER_API_KEY env var).",
    )
    parser.add_argument(
        "--skip-image",
        action="store_true",
        help="Skip hero image generation.",
    )
    parser.add_argument(
        "--skip-telegram",
        action="store_true",
        help="Skip Telegram channel publishing.",
    )
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("OPENROUTER_API_KEY")
    if not api_key and not args.dry_run:
        LOG.error(
            "OPENROUTER_API_KEY is required for article generation.\n"
            "  Set the environment variable or pass --api-key.\n"
            "  Use --dry-run to skip generation."
        )
        sys.exit(1)

    summary = run_pipeline(
        api_key=api_key or "",
        out_dir=args.out_dir,
        img_dir=args.img_dir,
        dry_run=args.dry_run,
        max_articles=args.max,
        single_url=args.single,
        skip_image=args.skip_image,
        skip_telegram=args.skip_telegram,
    )

    print("\n" + "═" * 60)
    print("PIPELINE SUMMARY")
    print("═" * 60)
    print(f"  RSS entries fetched:     {summary['fetched']}")
    print(f"  Classified to pillars:   {summary['classified']}")
    print(f"  Duplicates skipped:      {summary['duplicates_skipped']}")
    print(f"  Articles generated:      {summary['generated']}")
    print(f"  Images generated:        {summary['images_generated']}")
    print(f"  Articles written:        {summary['written']}")
    print(f"  Telegram posts sent:     {summary['telegram_sent']}")
    print(f"  Errors:                  {summary['errors']}")
    print(f"  Article output:          {args.out_dir}")
    print(f"  Image output:            {args.img_dir}")
    print("═" * 60)


if __name__ == "__main__":
    main()
