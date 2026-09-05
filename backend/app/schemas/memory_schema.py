from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class MemoryItemCreate(BaseModel):
    category: str
    content: str
    importance: int = 5

class MemoryItemResponse(BaseModel):
    id: UUID
    category: str
    content: str
    importance: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectMemoryResponse(BaseModel):
    id: UUID
    project_id: UUID
    memory_data: dict
    version: int
    updated_at: datetime

    class Config:
        from_attributes = True

class MemoryUpdateRequest(BaseModel):
    memory_data: dict   # Full structured memory object to save