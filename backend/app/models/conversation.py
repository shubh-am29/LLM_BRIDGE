from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from app.services.conversation_service import (
    create_conversation,
    get_conversations_for_project,
    get_conversation_by_id
)
from app.schemas.conversation_schema import ConversationCreate

router = APIRouter(prefix="/projects/{project_id}/conversations", tags=["Conversations"])

@router.post("/")
async def import_conversation(project_id: str, data: ConversationCreate):
    return await create_conversation(project_id, data)

@router.get("/")
def list_conversations(project_id: str):
    return get_conversations_for_project(project_id)

@router.get("/{conversation_id}")
def get_conversation(project_id: str, conversation_id: str):
    conv = get_conversation_by_id(conversation_id)
    if not conv or conv["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv