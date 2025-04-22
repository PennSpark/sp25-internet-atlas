import asyncio
import base64
import requests
from playwright.async_api import Browser
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




async def crawl_and_return(url: str, browser: Browser):
    """
    Crawls a page and returns its content and a screenshot in a format
    that Gemini AI can analyze directly.
    """
    context = await browser.new_context()
    page = await context.new_page()

    try:
        await page.goto(url, timeout=30000)
        text = await page.content()
        screenshot_bytes = await page.screenshot()
    except Exception as e:
        print(f"[crawl error] {url} | {e}")
        text, screenshot_bytes = "", None
    finally:
        await page.close()
        await context.close()

    return {
        "url": url,
        "text": text,
        "images": [
            {
                "data": screenshot_bytes,
                "mime_type": "image/png"
            }
        ] if screenshot_bytes else []
    }