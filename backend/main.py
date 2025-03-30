from fastapi import FastAPI, File, UploadFile
from PIL import Image
import io
from img_processing import generate_description, make_clip_embedding
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import os


load_dotenv()



app = FastAPI()
pc = Pinecone(api_key=os.getenv("PINECONE_KEY"))
index = pc.Index(host=os.getenv("PINECONE_INDEX_HOST"))


@app.get("/")
async def root():
    return {"message": "Hello World"}

    
@app.post("/img_embedding")
async def get_image_embeddings(file: UploadFile = File(...)):
    # Read the image data from the uploaded file
    img_data = await file.read()
    img = Image.open(io.BytesIO(img_data))

    # Generate the description based on the uploaded image
    description = generate_description(img)
    image_embeddings, text_embeddings = make_clip_embedding(img, description=description)
    
    return {"image_embedding": image_embeddings, "text_embedding": text_embeddings}


@app.post("/search")
async def get_website_distances()


@app.post("/embed_website")
async def embed_website_api(
    file: UploadFile = File(...),
    text: str = Form(...),
    url: str = Form(None)
):
    # 1. Read image
    img_data = await file.read()
    img = Image.open(io.BytesIO(img_data))

    # 2. Generate BLIP description
    description = generate_description(img)

    # 3. Get combined embedding
    combined_emb = embed_website(img, description, raw_text=text, method="concat")

    # 4. Create unique ID and store in Pinecone
    vector_id = str(uuid.uuid4())
    index.upsert(
        vectors=[
            {
                "id": vector_id,
                "values": combined_emb,
                "metadata": {
                    "caption": description,
                    "text": text[:500],
                    "url": url or "unknown"
                }
            }
        ]
    )

    return {
        "status": "success",
        "vector_id": vector_id,
        "caption": description
    }