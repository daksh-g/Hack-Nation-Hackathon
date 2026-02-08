from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/graph")
async def get_graph():
    return {
        "nodes": [],
        "edges": [],
        "metadata": {
            "generated_at": "",
            "node_count": 0,
            "edge_count": 0,
            "company_name": "Meridian Technologies"
        }
    }

@router.get("/graph/hierarchy")
async def get_hierarchy():
    return {
        "enterprise": {
            "id": "meridian",
            "name": "Meridian Technologies",
            "health": "yellow",
            "divisions": []
        }
    }

@router.get("/graph/node/{node_id}")
async def get_node(node_id: str):
    return {
        "node": {"id": node_id, "type": "person", "label": node_id},
        "edges": [],
        "connected_nodes": []
    }
