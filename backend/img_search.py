import pinecone
import numpy as np



def compute_sites_with_distances(keyword: str, limit: float, index):
    
    search_results = index.query(
        vector=None, # todo this
        top_k=10,  
        include_values=True,
        include_metadata=True
    )

    
    return search_results 
