from app.core.database import supabase
from app.utils.token_counter import count_tokens
import uuid

async def create_conversation(project_id: str, data) -> dict:
    # Create conversation
    conv_res = supabase.table("conversations").insert({
        "project_id": project_id,
        "title": data.title,
        "source": data.source
    }).execute()

    conversation = conv_res.data[0]
    conv_id = conversation["id"]

    # Insert messages
    messages = []
    for i, msg in enumerate(data.messages):
        messages.append({
            "conversation_id": conv_id,
            "role": msg.role,
            "content": msg.content,
            "token_count": count_tokens(msg.content),
            "position": msg.position if msg.position is not None else i
        })

    if messages:
        supabase.table("messages").insert(messages).execute()

    # Return conversation with messages
    return get_conversation_by_id(conv_id)

def get_conversation_by_id(conversation_id: str) -> dict | None:
    conv_res = supabase.table("conversations")\
        .select("*")\
        .eq("id", conversation_id)\
        .execute()

    if not conv_res.data:
        return None

    conversation = conv_res.data[0]

    msg_res = supabase.table("messages")\
        .select("*")\
        .eq("conversation_id", conversation_id)\
        .order("position")\
        .execute()

    conversation["messages"] = msg_res.data or []
    return conversation

def get_conversations_for_project(project_id: str) -> list:
    conv_res = supabase.table("conversations")\
        .select("*")\
        .eq("project_id", project_id)\
        .order("created_at", desc=True)\
        .execute()

    conversations = conv_res.data or []

    for conv in conversations:
        msg_res = supabase.table("messages")\
            .select("*")\
            .eq("conversation_id", conv["id"])\
            .order("position")\
            .execute()
        conv["messages"] = msg_res.data or []

    return conversations