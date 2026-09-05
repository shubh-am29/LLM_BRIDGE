from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class MessageCreate(BaseModel):
    role: str       # "user" | "assistant" | "system"
    content: str
    position: int | None = None

class ConversationCreate(BaseModel):
    title: str | None = None
    source: str | None = None      # "chatgpt", "gemini", "pasted"
    messages: list[MessageCreate] = []

class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    token_count: int | None
    position: int | None

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str | None
    source: str | None
    created_at: datetime
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True