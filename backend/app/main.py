from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Image Dataset Manager backend is running."}
from app.api import dataset

app.include_router(dataset.router)
