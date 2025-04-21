from fastapi import FastAPI, File, UploadFile, Form, Query
from PIL import Image 
import io

from fastapi.responses import JSONResponse
from img_processing import get_image_embeddings
from text_processing import get_text_embeddings
from pinecone import Pinecone, QueryResponse
from dotenv import load_dotenv
import os
import uuid
import numpy as np
from typing import Optional, List
from collections import defaultdict
from supabase import create_client, Client

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ADMIN_KEY")
SUPABASE: Client = create_client(url, key)

app = FastAPI()
pc = Pinecone(api_key=os.getenv("PINECONE_KEY"))
index = pc.Index(host=os.getenv("PINECONE_INDEX_HOST"))

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/embed-website")
async def embed_website_api(
    files: list[UploadFile] = File(...),
    text: str = Form(...),
    url: str = Form(...)
):
    img_embed = await get_image_embeddings(files)
    text_embed = get_text_embeddings(text)

    final_embedding = np.mean([img_embed, text_embed], axis=0)  # Average the embeddings
    
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

@app.get("/get_coordinates")
async def get_coordinates(axis1: str = Query(...), axis2: str = Query(...), axis3: Optional[str] = Query(None), k_returns: int = Query(500)):

    queries = [axis1, axis2, axis3] if axis3 else [axis1, axis2]

    # Get text embeddings for the search query
    search_embeddings = [get_text_embeddings(q) for q in queries]
    
    # Query Pinecone index for the k closest vectors
    search_results = [index.query(
        vector=embedding,
        top_k=k_returns,
        include_values=False,  # Set to True if you want the actual vector values
        include_metadata=True  # Include metadata to get URLs and text snippets
    ) for embedding in search_embeddings]
    
    formatted_results = [
        [{"id": match.get("id", ""), "score": match.get("score", 0)} for match in search_result.matches]
        for search_result in search_results
    ]

    merged_dict = defaultdict(list)

    for result_list in formatted_results:
        for item in result_list:
            merged_dict[item['id']].append(item['score'])

    merged_results = [{'id': id_, 'scores': tuple(scores)} for id_, scores in merged_dict.items()]
    
    return {
        "status": "success",
        "queries": queries,
        "axis_count": len(merged_results[0]) if merged_results else -1,
        "results_count": len(merged_results),
        "results": merged_results
    }

@app.get("/get_edges")
async def get_edges(websites: List[str] = Query(...)):
    result = SUPABASE.table("browsing_counts").select("*").in_("origin", websites).in_("target", websites).execute()
    return JSONResponse(
        content={
            "results_count": len(result.data),
            "results": result.data
        }
    )

@app.get("/target_edge")
async def get_target_edge(website1: str = Query(...), website2: str = Query(...)):
    result = SUPABASE.table("browsing_complete").select("*").eq("origin", website1).eq("target", website2).execute()
    return JSONResponse(
        content={
            "results_count": len(result.data),
            "results": result.data
        }
    )