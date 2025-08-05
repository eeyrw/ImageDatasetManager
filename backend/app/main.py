from fastapi import FastAPI
from pydantic import BaseModel, create_model
from typing import Dict, List, Optional, Any, Literal

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Image Dataset Manager backend is running."}

FIELDS = {
    "width": "int",
    "height": "int",
    "aesthetic_score": "float",
    "is_human": "bool",
    "tags": "list_str",
    "description": "str",
}


class IntCondition(BaseModel):
    op: Literal["eq", "ne", "lt", "lte", "gt", "gte"] = "eq"

class FloatCondition(BaseModel):
    op: Literal["eq", "ne", "lt", "lte", "gt", "gte"] = "eq"

class BoolCondition(BaseModel):
    op: Literal["eq", "ne"] = "eq"

class StrCondition(BaseModel):
    op: Literal["eq", "ne"] = "eq"
class ListStrCondition(BaseModel):
    op: Literal["contains"] = "contains"
    value: List[str]
    

TYPE_OPS_MAP = {
    "int":IntCondition,
    "float":FloatCondition,
    "bool":BoolCondition,    
    "str":StrCondition,   
    "list_str":ListStrCondition,       
}

def make_query_model():
    fields = {}
    for field, typ in FIELDS.items():
        cond_model = TYPE_OPS_MAP[typ]
        fields[field] = cond_model
    model = create_model("QueryModel", **fields)
    return model

QueryModel = make_query_model()

@app.post("/search")
async def search(query: QueryModel):
    return {"received_query": query.dict(exclude_none=True)}