from transformers import BlipProcessor, BlipForConditionalGeneration, CLIPProcessor, CLIPModel
import torch
from PIL import Image

# Load the BLIP model and processor
blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")  
blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to("cuda" if torch.cuda.is_available() else "cpu")

# Load the CLIP model and processor
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to("cuda" if torch.cuda.is_available() else "cpu")

def generate_description(img: Image.Image):
    # Try different prompts to get more detailed descriptions
    prompts = [
    "a website with an atmosphere that feels",
    "a webpage design creating a mood of",
    "a site with a visual ambiance conveying",
    "a digital interface evoking emotions of",
    "a web design with color tones suggesting",
    "a website experience that makes visitors feel",
    "a web interface with visual elements creating a sense of",
    "a website aesthetic that establishes a mood of"
]
    
    descriptions = []
    for prompt in prompts:
        print("doing it")
        inputs = blip_processor(img, text=prompt, return_tensors="pt").to("cuda" if torch.cuda.is_available() else "cpu")
        output = blip_model.generate(**inputs, min_length=30, max_length=70, num_beams=1, temperature=0.8, do_sample=True)
        description = blip_processor.decode(output[0], skip_special_tokens=True)
        descriptions.append(description)
    
    # default for now change when we can analyze prompts better
    return descriptions[0]

def make_clip_embedding(img: Image.Image, description: str):
    # Preprocess the image and text for the CLIP model
    inputs = clip_processor(text=[description], images=img, return_tensors="pt", padding=True)

    with torch.no_grad():
        # Extract image embeddings
        image_embeddings = clip_model.get_image_features(pixel_values=inputs["pixel_values"])
        
        # Extract text embeddings
        text_embeddings = clip_model.get_text_features(input_ids=inputs["input_ids"], attention_mask=inputs["attention_mask"])

    # Convert embeddings to NumPy arrays
    image_embeddings = image_embeddings.cpu().detach().numpy().flatten().tolist()
    text_embeddings = text_embeddings.cpu().detach().numpy().flatten().tolist()

    # Optionally, print the embeddings
    
    # Return the embeddings as NumPy arrays
    return image_embeddings, text_embeddings
