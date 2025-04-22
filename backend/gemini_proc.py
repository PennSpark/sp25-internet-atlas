from typing import List, Dict
from fastapi import UploadFile
import google.generativeai as genai
from google.generativeai.types import ContentType
from PIL.Image import Image
import base64
import os



genai.configure(api_key=os.getenv("GEMINI_KEY"))
model = genai.GenerativeModel('gemini-1.5-pro-latest')

async def img_and_txt_to_description(web_text: str, images: List[Image] ) -> str:
    """
    Analyzes a list of image byte dictionaries and website text using Gemini Pro 1.5.
    Each image part must contain 'data' (bytes) and 'mime_type' (e.g., 'image/png').
    """
    prompt = "Give a description of the website provided images and text."

    contents = [web_text, *images, prompt]
    try:
        response = await model.generate_content(contents=contents, stream=False)
        return response.text
    except Exception as e:
        return f"Error generating content: {e}"
