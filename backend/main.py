from fastapi import FastAPI

# server config
from asyncio import create_task
from contextlib import asynccontextmanager
from server_utils import keep_alive
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI): 
    create_task(keep_alive)
    yield

app = FastAPI(lifespan = lifespan)

app.add_middleware(
    CORSMiddleware, 
    allow_origins = ['*'], # change to frontend URL 
    allow_credentials = True,
    allow_methods=['*'],
    allow_headers=['*']
)

@app.get("/")
async def root():
    return {"message": "Hello World"}