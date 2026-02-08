from fastapi import APIRouter, HTTPException
from services.graph_store import load_graph, load_hierarchy, get_node_by_id

router = APIRouter(prefix="/api")


@router.get("/graph")
async def get_graph():
    return load_graph()


@router.get("/graph/hierarchy")
async def get_hierarchy():
    return load_hierarchy()


@router.get("/graph/node/{node_id}")
async def get_node(node_id: str):
    result = get_node_by_id(node_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return result
