import asyncio
from PIL import Image
from io import BytesIO
from playwright.async_api import Browser, async_playwright


async def crawl_and_return(url: str):
    """
    Crawls a page and returns its content and a screenshot
    as a list of PIL images.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto(url, timeout=60000)
            text = await page.content()
            screenshot_bytes = await page.screenshot()
            screenshot_pil = Image.open(BytesIO(screenshot_bytes)) if screenshot_bytes else None
        except Exception as e:
            print(f"[crawl error] {url} | {e}")
            text, screenshot_pil = "", None
        finally:
            await page.close()
            await context.close()
            await browser.close()

        return {
            "url": url,
            "text": text,
            "images": [screenshot_pil] if screenshot_pil else []
        }
