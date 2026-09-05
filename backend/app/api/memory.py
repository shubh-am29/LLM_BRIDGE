from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/projects/{project_id}/memory", tags=["Memory"])

EMPTY_MEMORY = {
    "project_overview": "",
    "requirements": [],
    "architecture": "",
    "technologies": [],
    "current_progress": [],
    "key_decisions": [],
    "pending_tasks": [],
    "known_issues": [],
    "agent_instructions": []
}

def get_or_create(project_id: str):
    res = supabase.table("project_memory")\
        .select("*")\
        .eq("project_id", project_id)\
        .execute()
    if res.data:
        return res.data[0]
    new_res = supabase.table("project_memory").insert({
        "project_id": project_id,
        "memory_data": EMPTY_MEMORY.copy(),
        "version": 1
    }).execute()
    return new_res.data[0]

@router.get("/")
def get_memory(project_id: str):
    return get_or_create(project_id)

@router.put("/")
def save_memory(project_id: str, data: dict):
    current = get_or_create(project_id)
    # Snapshot current to versions
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": current["memory_data"],
        "version": current["version"],
        "change_summary": data.get("change_summary", "Manual save"),
        "session_id": data.get("session_id")
    }).execute()
    new_version = current["version"] + 1
    updated = supabase.table("project_memory")\
        .update({
            "memory_data": data["memory_data"],
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("project_id", project_id)\
        .execute()
    return updated.data[0]

@router.get("/versions")
def list_versions(project_id: str):
    res = supabase.table("memory_versions")\
        .select("*")\
        .eq("project_id", project_id)\
        .order("version", desc=True)\
        .execute()
    return res.data or []

@router.post("/versions/{version_number}/restore")
def restore_version(project_id: str, version_number: int):
    res = supabase.table("memory_versions")\
        .select("*")\
        .eq("project_id", project_id)\
        .eq("version", version_number)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Version not found")
    snapshot = res.data[0]
    current = get_or_create(project_id)
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": current["memory_data"],
        "version": current["version"],
        "change_summary": f"Auto-snapshot before restoring v{version_number}"
    }).execute()
    new_version = current["version"] + 1
    updated = supabase.table("project_memory")\
        .update({
            "memory_data": snapshot["memory_data"],
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("project_id", project_id)\
        .execute()
    return updated.data[0]