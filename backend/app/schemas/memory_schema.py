from pydantic import BaseModel, ConfigDict, Field
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

    model_config = ConfigDict(from_attributes=True)

class ProjectMemoryResponse(BaseModel):
    id: UUID
    project_id: UUID
    memory_data: dict
    version: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MemoryUpdateRequest(BaseModel):
    memory_data: dict   # Full structured memory object to save

class MemoryIngestRequest(BaseModel):
    # Partial memory fields derived from a CLI project scan. Only fields
    # present here are considered — any field the analyser couldn't
    # confidently derive should simply be omitted, not sent as empty.
    detected_memory: dict
    # Optional scan metadata (file count, languages, frameworks, scan
    # time) — stored for traceability, not merged into memory_data.
    metadata: dict = Field(default_factory=dict)