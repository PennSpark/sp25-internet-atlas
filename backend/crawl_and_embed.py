import asyncio
import base64
import requests
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import CosineStrategy
from playwright.async_api import Page
import os
from urllib.parse import urlparse


async def crawl_and_extract(url, browser):
    context = await browser.new_context()
    page = await context.new_page()

    try:
        await page.goto(url, timeout=30000)
        text = await page.content()
        screenshot = await page.screenshot()
    except Exception as e:
        print(f"[crawl error] {url} | {e}")
        text, screenshot = "", None
    finally:
        await page.close()
        await context.close()

    return text, screenshot




async def crawl_extract_and_upload(url: str, browser):
    try:
        text, screenshot = await crawl_and_extract(url, browser)

        if not screenshot:
            print(f"Skipping upload for {url}")
            return False

        domain = urlparse(url).netloc.replace(".", "_")
        screenshot_path = f"screenshots/{domain}.png"
        os.makedirs("screenshots", exist_ok=True)

        with open(screenshot_path, "wb") as f:
            f.write(screenshot)

        with open(screenshot_path, "rb") as img_file:
            response = requests.post(
                "http://127.0.0.1:8000/embed-website",
                files={"files": img_file},
                data={"text": text, "url": url}
            )
            print(f"Uploaded {url} — Status: {response.status_code}")

        return True

    except Exception as e:
        print(f"[Inner Error] {url} | Reason: {e}")
        return False
