# main.py with simplified background queue and rate limiting

from PIL import Image 
from fastapi import FastAPI, Form
from fastapi.responses import JSONResponse
from crawl_and_embed import crawl_and_return 
from gemini_proc import img_and_txt_to_description, generate_embedding
from pinecone import Pinecone 
from dotenv import load_dotenv
import os
import uuid
import asyncio
import time
from datetime import datetime
import queue
import threading

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_KEY"))
index = pc.Index(host=os.getenv("PINECONE_INDEX_HOST"))

# Create a job queue
job_queue = queue.Queue()

# Job status tracking
job_status = {}

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
        crawl_data = await crawl_and_return(url)
        
        # Wait for rate limiter before making Gemini API call
        await gemini_rate_limiter.wait_if_needed()
        
        # Generate description and embedding
        description = await img_and_txt_to_description(crawl_data["text"], crawl_data["images"])
        
        # Check if embedding was generated successfully
        if description["error"] is not None or description["embedding"] is None:
            return {
                "status": "error",
                "message": f"Failed to generate embedding: {description['error']}"
            }
        
        # Access the embedding
        embedding_vector = description["embedding"]["embedding"]
        
        # Check dimensions
        vector_dim = len(embedding_vector)
        if vector_dim != 3072:
            return {
                "status": "error",
                "message": f"Vector dimension mismatch: {vector_dim} (needs to be 3072)"
            }
        
        # If dimensions match, proceed with upsert
        index.upsert(
            vectors=[{
                "id": url,
                "values": embedding_vector
            }],
            namespace=""
        )
        
        return {
            "status": "completed",
            "description": description["text"]
        }
    except Exception as e:
        # If we get a rate limit error, requeue the job
        if "rate limit" in str(e).lower() or "quota" in str(e).lower():
            # Requeue the job
            job_queue.put((job_id, url))
            return {
                "status": "requeued",
                "message": f"Hit rate limit, job requeued"
            }
        return {
            "status": "error",
            "message": f"Error: {str(e)}"
        }

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/embed-website")
async def embed_website_api(url: str = Form(...)):
    print("hello")
    print("=" * 80)
    fetch_response = index.fetch(ids=[url])
        
    if fetch_response:
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
    
    # Query Pinecone index
    search_results = index.query(
        vector=generate_embedding(query),
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