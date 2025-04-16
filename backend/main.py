from fastapi import FastAPI, File, UploadFile, Form
from PIL import Image 
import io
from img_processing import get_image_embeddings
from text_processing import get_text_embeddings
from pinecone import Pinecone 
from dotenv import load_dotenv
import os
import uuid
import numpy as np


load_dotenv()



app = FastAPI()
pc = Pinecone(api_key=os.getenv("PINECONE_KEY"))
index = pc.Index(host=os.getenv("PINECONE_INDEX_HOST"))


@app.get("/")
async def root():
    return {"message": "Hello World"}

    
from fastapi import FastAPI, File, UploadFile
from PIL import Image
import io
import numpy as np
from img_processing import generate_description, make_clip_embedding

app = FastAPI()



@app.post("/embed-website")
async def embed_website_api(
    files: list[UploadFile] = File(...),
    text: str = Form(...),
    url: str = Form(...)
):
    img_embed = await get_image_embeddings(files)
    text_embed = get_text_embeddings(text)

    final_embedding = np.mean([img_embed, text_embed], axis=0)  # Average the embeddings
    ##consider final_embedding = 0.7 * np.array(img_embed) + 0.3 * np.array(text_embed) for better weighting??
    
    index.upsert(
        vectors=[{
            "id": url,
            "values": final_embedding.tolist(),
        }],
        namespace=""
    )
    return {
        "status": "success",
        "embedding": final_embedding.tolist(),
        "url": url
    }

    
@app.post("/search_vectors")
async def search_web_embeddings(query: str = Form(...), k_returns: int = Form(5)):
    # Get text embeddings for the search query
    text_search_embedding = get_text_embeddings(query)
    
    # Query Pinecone index for the k closest vectors
    search_results = index.query(
        vector=text_search_embedding,
        top_k=k_returns,
        include_values=False,  # Set to True if you want the actual vector values
        include_metadata=True  # Include metadata to get URLs and text snippets
    )
    
    # Format results for API response
    formatted_results = []
    for match in search_results.matches:
        formatted_results.append({"id": match.get("id", ""), "score": match.get("score", 0)})
    
    return {
        "status": "success",
        "query": query,
        "results_count": len(formatted_results),
        "results": formatted_results
    }

@app.post("/scrape-website")
async def scrape_url(url: str = Form(...)):
    print("todo")
