from typing import List, Dict
from fastapi import UploadFile
from google.cloud import aiplatform
import base64

aiplatform.init(location="us-central1")
model = aiplatform.GenerativeModel(model_name="gemini-pro-1.5-vision")

async def img_and_txt_to_description(web_text: str, image_parts: List[Dict[str, bytes]]) -> str:
    """
    Analyzes a list of image byte dictionaries and website text using Gemini Pro 1.5.
    Each image part must contain 'data' (bytes) and 'mime_type' (e.g., 'image/png').
    """
    contents = []

    for image in image_parts:
        try:
            contents.append(
                aiplatform.generative_models.Part.from_image(
                    data=image["data"],
                    mime_type=image["mime_type"]
                )
            )
        except Exception as e:
            print(f"Error processing image part: {e}")
            continue

    contents.append(
        aiplatform.generative_models.Part.from_text(
            f"Analyze these images and the following website text:\n\n{web_text}\n\n"
            "Provide a comprehensive summary and insights based on the visuals and HTML content."
        )
    )

    try:
        response = await model.generate_content(contents=contents, stream=False)
        return response.text
    except Exception as e:
        return f"Error generating content: {e}"
