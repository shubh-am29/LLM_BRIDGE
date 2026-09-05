from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/projects/{project_id}/proposals", tags=["Proposals"])

def get_or_create_memory(project_id: str):
    res = supabase.table("project_memory")\
        .select("*")\
        .eq("project_id", project_id)\
        .execute()
    if res.data:
        return res.data[0]
    new_res = supabase.table("project_memory").insert({
        "project_id": project_id,
        "memory_data": {},
        "version": 1
    }).execute()
    return new_res.data[0]

@router.get("/")
def list_proposals(project_id: str):
    res = supabase.table("proposed_changes")\
        .select("*")\
        .eq("project_id", project_id)\
        .order("created_at", desc=True)\
        .execute()
    return res.data or []

@router.get("/{proposal_id}")
def get_proposal(project_id: str, proposal_id: str):
    res = supabase.table("proposed_changes")\
        .select("*")\
        .eq("id", proposal_id)\
        .eq("project_id", project_id)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return res.data[0]

@router.post("/{proposal_id}/approve")
def approve_proposal(project_id: str, proposal_id: str, data: dict = {}):
    prop_res = supabase.table("proposed_changes")\
        .select("*")\
        .eq("id", proposal_id)\
        .execute()
    if not prop_res.data:
        raise HTTPException(status_code=404, detail="Proposal not found")
    proposal = prop_res.data[0]

    # Use edited memory if provided, otherwise use proposed
    final_memory = data.get("memory_data") or proposal["proposed_memory"]

    current = get_or_create_memory(project_id)

    # Snapshot current
    supabase.table("memory_versions").insert({
        "project_id": project_id,
        "memory_data": current["memory_data"],
        "version": current["version"],
        "change_summary": f"Approved changes from session",
        "session_id": proposal.get("session_id")
    }).execute()

    # Save new memory
    new_version = current["version"] + 1
    supabase.table("project_memory")\
        .update({
            "memory_data": final_memory,
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("project_id", project_id)\
        .execute()

    # Mark proposal approved
    supabase.table("proposed_changes")\
        .update({"status": "approved"})\
        .eq("id", proposal_id)\
        .execute()

    return {"message": "Changes approved", "version": new_version}

@router.post("/{proposal_id}/reject")
def reject_proposal(project_id: str, proposal_id: str):
    supabase.table("proposed_changes")\
        .update({"status": "rejected"})\
        .eq("id", proposal_id)\
        .execute()
    return {"message": "Proposal rejected"}