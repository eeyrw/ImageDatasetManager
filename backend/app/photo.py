from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import threading

app = FastAPI()

app.mount("/static", StaticFiles(directory="../../frontend", html=True), name="static")

ROOT_DIR = Path("xxxx")
IMAGE_DIR = Path("xxxx/yyyy")

IMGPROXY_URL = "http://localhost:8082"
IMGPROXY_PATH_PREFIX = "/insecure/rs:fit:300:300/plain/local://"

image_exts = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}

all_images = []
all_images_lock = threading.Lock()

def load_all_images():
    global all_images
    imgs = sorted([
        f for f in IMAGE_DIR.rglob("*")
        if f.suffix.lower() in image_exts and f.is_file()
    ])
    with all_images_lock:
        all_images = imgs
    print(f"Loaded {len(imgs)} images.")

load_all_images()

class ImagePage(BaseModel):
    total: int
    page: int
    size: int
    images: List[str]

@app.get("/api/images", response_model=ImagePage)
def list_images(page: int = 0, size: int = 30):
    with all_images_lock:
        total = len(all_images)
        start = page * size
        end = min(start + size, total)
        selected = all_images[start:end]

    result = []
    for f in selected:
        rel_path = f.relative_to(ROOT_DIR)
        url_path = f"{IMGPROXY_PATH_PREFIX}/{rel_path.as_posix()}@webp"
        result.append(f"{IMGPROXY_URL}{url_path}")

    return ImagePage(
        total=total,
        page=page,
        size=size,
        images=result
    )

@app.post("/api/images/refresh")
def refresh_images():
    threading.Thread(target=load_all_images).start()
    return {"message": "Started refreshing images in background."}
