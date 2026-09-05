from fastapi import APIRouter
from app.services.memory_service import (
    get_or_create_memory,
    update_memory,
    get_memory_versions
)
from app.schemas.memory_schema import MemoryUpdateRequest

router = APIRouter(prefix="/projects/{project_id}/memory", tags=["Memory"])

@router.get("/")
def get_memory(project_id: str):
    return get_or_create_memory(project_id)

@router.put("/")
def save_memory(project_id: str, data: MemoryUpdateRequest):
    return update_memory(project_id, data.memory_data)

@router.get("/versions")
def list_versions(project_id: str):
    return get_memory_versions(project_id)