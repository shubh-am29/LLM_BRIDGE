from app.core.database import supabase
from datetime import datetime, timezone

EMPTY_MEMORY = {
    "project_overview": "",
    "requirements": [],
    "architecture": "",
    "technologies": [],
    "decisions": [],
    "constraints": [],
    "current_progress": "",
    "pending_tasks": [],
    "important_code": [],
    "errors_and_solutions": [],
    "source_references": []
}

def get_or_create_memory(project_id: str) -> dict:
    res = supabase.table("project_memory")\
        .select("*")\
        .eq("project_id", project_id)\
        .execute()

    if res.data:
        return res.data[0]

    # Create fresh memory
    new_res = supabase.table("project_memory").insert({
        "project_id": project_id,
        "memory_data": EMPTY_MEMORY.copy(),
        "version": 1
    }).execute()

    return new_res.data[0]

def update_memory(project_id: str, memory_data: dict) -> dict:
    current = get_or_create_memory(project_id)

    # Save current to version history
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": current["memory_data"],
        "version": current["version"]
    }).execute()

    # Update current memory
    new_version = current["version"] + 1
    updated = supabase.table("project_memory")\
        .update({
            "memory_data": memory_data,
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("project_id", project_id)\
        .execute()

    return updated.data[0]

def get_memory_versions(project_id: str) -> list:
    res = supabase.table("memory_versions")\
        .select("*")\
        .eq("project_id", project_id)\
        .order("version", desc=True)\
        .execute()

    return res.data or []