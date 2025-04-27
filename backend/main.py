
# main.py with simplified background queue and rate limiting

from PIL import Image 
from fastapi import FastAPI, File, UploadFile, Form, Query
from fastapi.responses import JSONResponse
from crawl_and_embed import crawl_and_return 
from gemini_proc import img_and_txt_to_description, generate_embedding
from pinecone import Pinecone 
from dotenv import load_dotenv
import io
import os
import uuid
import numpy as np
import asyncio
import time
from datetime import datetime
import queue
import threading
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig
from typing import Optional, List
from collections import defaultdict
from supabase import create_client, Client

from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ADMIN_KEY")
SUPABASE: Client = create_client(url, key)

#Initialize FastAPI
app = FastAPI()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_KEY"))
index = pc.Index(host=os.getenv("PINECONE_INDEX_HOST"))

# Create a job queue
job_queue = queue.Queue()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job status tracking
job_status = {}

browser_config = BrowserConfig(
    verbose=True
)

crawler = AsyncWebCrawler(config=browser_config)

# Rate limiting configuration
class RateLimiter:
    def __init__(self, calls_per_minute=30):
        self.calls_per_minute = calls_per_minute
        self.call_times = []
        self.lock = threading.Lock()
    
    async def wait_if_needed(self):
        """Wait if we're exceeding the rate limit"""
        with self.lock:
            now = time.time()
            # Remove timestamps older than 1 minute
            self.call_times = [t for t in self.call_times if t > now - 60]
            
            # If we've hit the limit, wait until we can make another call
            if len(self.call_times) >= self.calls_per_minute:
                wait_time = 60 - (now - self.call_times[0])
                if wait_time > 0:
                    self.lock.release()
                    await asyncio.sleep(wait_time + 0.1)
                    self.lock.acquire()
            
            # Record this call
            self.call_times.append(time.time())

# Initialize rate limiter
gemini_rate_limiter = RateLimiter(calls_per_minute=30)

# Worker function to process jobs in the background
def process_queue():
    while True:
        try:
            # Get a job from the queue
            job_id, url = job_queue.get(block=True)
            
            # Update status to processing
            job_status[job_id] = {
                "status": "processing",
                "url": url
            }
            
            # Process the job
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(process_website(url, job_id))
                job_status[job_id].update(result)
            except Exception as e:
                job_status[job_id].update({
                    "status": "error",
                    "message": f"Error: {str(e)}"
                })
            finally:
                loop.close()
                job_queue.task_done()
            
        except Exception as e:
            print(f"Worker error: {str(e)}")
            time.sleep(1)

# Start worker threads
NUM_WORKERS = 3
for _ in range(NUM_WORKERS):
    worker = threading.Thread(target=process_queue, daemon=True)
    worker.start()

async def process_website(url: str, job_id: str):
    """Process a website - crawl, generate description and store embedding"""
    try:

        # Crawl website
        print(f"[Process] Crawling {url}...")
        crawl_data = await crawl_and_return(url, crawler)
        print(f"[Process] Crawl success. Got text length={len(crawl_data['text'])}, images={len(crawl_data['images'])}")
        
        # Wait for rate limiter before making Gemini API call
        await gemini_rate_limiter.wait_if_needed()
        
        # Generate description and embedding
        # print(f"[Process] Generating description and embedding for {url}...")
        # description = await img_and_txt_to_description(crawl_data["text"], crawl_data["images"])
        
        # Check if embedding was generated successfully
        # if description["error"] is not None or description["embedding"] is None:
        #     print(f"[Process] Embedding generation failed: {description['error']}")
        #     return {
        #         "status": "error",
        #         "message": f"Failed to generate embedding: {description['error']}"
        #     }
        
        # Access the embedding
        # embedding_vector = description["embedding"]["embedding"]
        # print(f"[Process] Embedding vector length: {len(embedding_vector)}")
        
        # Check dimensions
        # vector_dim = len(embedding_vector)
        # if vector_dim != 3072:
        #     print(f"[Process] Dimension mismatch: {vector_dim}")
        #     return {
        #         "status": "error",
        #         "message": f"Vector dimension mismatch: {vector_dim} (needs to be 3072)"
        #     }
        
        # If dimensions match, proceed with upsert
        print(f"[Process] Upserting {url} into Pinecone...")
        # index.upsert(
        #     vectors=[{
        #         "id": url,
        #         "values": embedding_vector
        #     }],
        #     namespace=""
        # )
        print(f"[Process] Upsert complete for {url}.")
        
        return {
            "status": "completed",
            "description": None # description["text"]
        }
    except Exception as e:
        # If we get a rate limit error, requeue the job
        if "rate limit" in str(e).lower() or "quota" in str(e).lower():
            # Requeue the job
            job_queue.put((job_id, url))
            print(f"requeued {url}")
            return {
                "status": "requeued",
                "message": f"Hit rate limit, job requeued"
            }
        print(f"Error: {str(e)}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/")
async def root():
    return {"message": "Hello World"}

#for debugging
def diagnose_missing_fetches(url: str, fetch_response):
    """Prints a diagnosis if a fetch returns no vectors."""
    print(f"[Diagnose] URL: {url}")
    if not fetch_response.vectors:
        print(f"[Diagnose] No vectors found for {url}")
        if fetch_response.namespace != "":
            print(f"[Diagnose] Warning: fetch returned non-empty namespace: {fetch_response.namespace}")
        print(f"[Diagnose] Usage stats: {fetch_response.usage}")
    else:
        print(f"[Diagnose] Successfully fetched vector for {url}")


@app.post("/embed-website")
async def embed_website_api(url: str = Form(...)):
    print("=" * 80)
    fetch_response = index.fetch(ids=[url])

    diagnose_missing_fetches(url, fetch_response)
        
    if fetch_response.vectors:
        return {
        "status": "website exists",
        "url": url
    } 
        
    # Generate a job ID
    job_id = str(uuid.uuid4())
    
    # Add job to status tracker
    job_status[job_id] = {
        "status": "queued",
        "url": url
    }
    
    # Add job to processing queue
    job_queue.put((job_id, url))
    
    return {
        "status": "queued",
        "job_id": job_id,
        "url": url
    }


@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    if job_id in job_status:
        return job_status[job_id]
    else:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Job not found"}
        )


@app.post("/search_vectors")
async def search_web_embeddings(query: str = Form(...), k_returns: int = Form(5)):
    # Wait for rate limiter before making Gemini API call for embedding
    await gemini_rate_limiter.wait_if_needed()

    query_vector_response = await generate_embedding(query)
    query_vector = query_vector_response["embedding"] if isinstance(query_vector_response, dict) else query_vector_response

    search_results = index.query(
        vector=query_vector,
        top_k=k_returns,
        include_values=False,
        include_metadata=True
    )   
    
    # Format results
    formatted_results = []
    for match in search_results.matches:
        formatted_results.append({"id": match.get("id", ""), "score": match.get("score", 0)})
    
    return {
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
async def get_edges(websites: List[str] = Query(...), users: List[int] = Query(...)):
    result = SUPABASE.rpc("count_users_by_site_pair", {
        "user_ids": users, 
        "websites": websites
    }).execute()
    return JSONResponse(
        content={
            "results_count": len(result.data),
            "results": result.data
        }
    )

@app.get("/target_edge")
async def get_target_edge(website1: str = Query(...), website2: str = Query(...), users: List[int] = Query(...)):
    result = SUPABASE.rpc("count_user_records_between_sites", {
        "user_ids": users, 
        "origin_site": website1,
        "target_site": website2
    }).execute()
    return JSONResponse(
        content={
            "results_count": len(result.data),
            "results": result.data
        }
    )

@app.get("/user_edges")
async def get_user_edges(user_id: int = Query(...), websites: List[str] = Query(...)):
    result = SUPABASE.table("browsing_complete").select("*").eq("user", user_id).in_("origin", websites).in_("target", websites).execute()
    return JSONResponse(
        content={
            "results_count": len(result.data),
            "results": result.data
        }
    )

# gets all of the edges of a particular user
