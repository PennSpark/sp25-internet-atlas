import asyncio
import base64
import requests
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import CosineStrategy


# This is an example for how to use crawl4ai
# async def crawl_extract_and_upload(url):
#     # Define the extraction strategy (using CosineStrategy)
#     strategy = CosineStrategy(
#         semantic_filter="main content",  # Look for core content on the page
#         word_count_threshold=10,           # Only consider blocks with at least 10 words
#         sim_threshold=0.1                  # Minimum similarity threshold for including a block
#     )
    
#     # Set up crawler configuration with screenshot enabled and our extraction strategy.
#     browser_conf = BrowserConfig(headless=True)
#     run_conf = CrawlerRunConfig(
#         cache_mode=CacheMode.BYPASS,
#         screenshot=True,               # Enable screenshot capture
#         extraction_strategy=strategy   # Use our defined strategy for content extraction
#     )
    
#     # Crawl the specified URL
#     async with AsyncWebCrawler(config=browser_conf) as crawler:
#         result = await crawler.arun(url=url, config=run_conf)
        
#         if result.success and result.screenshot:
#             # Save the screenshot (base64 encoded) to a local file
#             screenshot_path = "screenshot.png"
#             with open(screenshot_path, "wb") as f:
#                 f.write(base64.b64decode(result.screenshot))
            
#             # Extract text content using the strategy; this could be markdown or another extracted format.
#             # Fallback to an empty string if nothing was extracted.
#             text_content = result.extracted_content if hasattr(result, "extracted_content") else ""
            
#             # Step: Upload the scraped data to your FastAPI backend's /embed-website endpoint.
#             with open(screenshot_path, "rb") as img_file:
#                 response = requests.post(
#                     "http://127.0.0.1:8000/embed-website",
#                     files={"files": img_file},
#                     data={"text": text_content, "url": url}
#                 )
#                 print("Backend upload response:", response.status_code, response.text)
#         else:
#             print("Crawl failed for URL:", url)

# Example usage:

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(crawl_extract_and_upload("https://www.cis.upenn.edu/"))

async def crawl_and_extract(url : str):
    # Joe
    print("todo")