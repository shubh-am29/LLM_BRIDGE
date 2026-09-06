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
    "agent_instructions": [],
    # legacy fields kept for backwards compat
    "decisions": [],
    "constraints": [],
    "important_code": [],
    "errors_and_solutions": [],
    "source_references": [],
}


def get_or_create(project_id: str):
    res = supabase.table("project_memory") \
        .select("*") \
        .eq("project_id", project_id) \
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
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": current["memory_data"],
        "version": current["version"],
        "change_summary": data.get("change_summary", "Manual save"),
        "session_id": data.get("session_id")
    }).execute()
    new_version = current["version"] + 1
    updated = supabase.table("project_memory") \
        .update({
            "memory_data": data["memory_data"],
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }) \
        .eq("project_id", project_id) \
        .execute()
    return updated.data[0]


@router.get("/versions")
def list_versions(project_id: str):
    res = supabase.table("memory_versions") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("version", desc=True) \
        .execute()
    return res.data or []


@router.post("/versions/{version_number}/restore")
def restore_version(project_id: str, version_number: int):
    res = supabase.table("memory_versions") \
        .select("*") \
        .eq("project_id", project_id) \
        .eq("version", version_number) \
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
    updated = supabase.table("project_memory") \
        .update({
            "memory_data": snapshot["memory_data"],
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }) \
        .eq("project_id", project_id) \
        .execute()
    return updated.data[0]


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Project file ingestion endpoint
# ─────────────────────────────────────────────────────────────────────────────

def _merge_lists(existing: list, incoming: list) -> list:
    """Merge two lists, deduplicate, preserve existing order."""
    seen = set()
    result = []
    for item in existing + incoming:
        key = str(item).strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _merge_text(existing: str, incoming: str) -> str:
    """Keep existing text if it is detailed; use incoming if existing is empty."""
    existing = (existing or "").strip()
    incoming = (incoming or "").strip()
    if not existing:
        return incoming
    if not incoming:
        return existing
    # Existing is richer (longer) — keep it; otherwise prefer incoming
    return existing if len(existing) >= len(incoming) else incoming


def _safe_merge_memory(existing: dict, detected: dict) -> dict:
    """
    Merge detected (auto-generated) memory into existing (manual) memory.
    Rules:
    - Lists: union of both, deduplicated
    - Text fields: keep existing if non-empty and longer; else use detected
    - Never delete existing items
    """
    merged = dict(existing)  # start from existing

    list_fields = [
        "technologies", "requirements", "current_progress",
        "key_decisions", "pending_tasks", "known_issues",
        "agent_instructions", "decisions", "constraints",
        "important_code", "errors_and_solutions", "source_references",
    ]
    text_fields = ["project_overview", "architecture"]

    for field in list_fields:
        existing_val = existing.get(field) or []
        detected_val = detected.get(field) or []
        merged[field] = _merge_lists(existing_val, detected_val)

    for field in text_fields:
        existing_val = existing.get(field) or ""
        detected_val = detected.get(field) or ""
        merged[field] = _merge_text(existing_val, detected_val)

    return merged


@router.post("/ingest")
def ingest_project(project_id: str, data: dict):
    """
    Accept scanned project data from the CLI, analyse it server-side,
    merge with existing memory, and persist.

    Body:
    {
        "detected_memory": { ...memory fields... },
        "metadata": { "file_count": 25, "languages": [...], ... }
    }
    """
    if not data:
        raise HTTPException(status_code=400, detail="Request body is required")

    detected = data.get("detected_memory", {})
    if not isinstance(detected, dict):
        raise HTTPException(status_code=400, detail="detected_memory must be an object")

    current_record = get_or_create(project_id)
    existing_memory = current_record.get("memory_data") or {}

    # Safe merge: detected data never destroys manual data
    merged = _safe_merge_memory(existing_memory, detected)

    # Snapshot existing version before update
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": existing_memory,
        "version": current_record["version"],
        "change_summary": "Auto-snapshot before ctxbridge sync ingestion"
    }).execute()

    new_version = current_record["version"] + 1
    updated = supabase.table("project_memory") \
        .update({
            "memory_data": merged,
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }) \
        .eq("project_id", project_id) \
        .execute()

    return {
        "success": True,
        "version": new_version,
        "memory_data": merged,
        "metadata": data.get("metadata", {})
    }