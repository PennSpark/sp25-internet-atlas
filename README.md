# Internet Atlas

A full‑stack web app that visualizes the “shape” of the web by plotting websites against two user‑supplied descriptors (e.g. “warm” vs. “hand‑crafted”) and drawing real navigation paths between them.

---

## 🚀 Project Overview

- **What it does:**  
  1. User enters two adjectives.  
  2. Backend turns each adjective into a vector, queries a Pinecone index of site embeddings, and ranks all sites by similarity on each axis.  
  3. Fetches real “edges” (user navigation paths) from our edge database.  
  4. Frontend renders an interactive 2D graph (nodes = websites; edges = actual navigational transitions).

- **Why it matters:**  
  Helps researchers, designers, and curious minds explore how the visual “feel” and structure of websites relate to actual user behavior.

---

## 🏗️ Architecture & Tech Stack

| Layer                     | Tech & Tools                                                                                                 |
|---------------------------|--------------------------------------------------------------------------------------------------------------|
| **Data Collection**       | • [Crawl4AI](https://crawl4ai.com/) for HTML/text + screenshots                                             |
| **Embedding Generation**  | • Text: Sentence‑BERT / CLIP text embeddings<br>• Images: CLIP image / ResNet / EfficientNet                 |
| **Vector Database**       | • [Pinecone](https://www.pinecone.io/) for multimodal vector storage and similarity search                  |
| **Backend API**           | • [FastAPI](https://fastapi.tiangolo.com/)<br>• `/embed-website`, `/search-vectors`, `/get-graph` endpoints  |
| **Model Evaluation**      | • Python scripts under `scripts/` to ingest test URLs, run predefined queries, and compute metrics (top‑1 accuracy, NDCG@3, etc.) |
| **Frontend Visualization**| • React + Vite<br>• D3.js (or PaperJS) for interactive zoom/pan, tooltips, and path highlighting            |
| **Deployment**            | • Docker for backend & scraper<br>• Hosted on Render/Heroku + Pinecone + Supabase                           |
