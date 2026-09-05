from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from app.schemas.project_schema import ProjectCreate, ProjectUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/")
def create_project(data: ProjectCreate):
    res = supabase.table("projects").insert({
        "name": data.name,
        "description": data.description
    }).execute()
    return res.data[0]

@router.get("/")
def list_projects():
    res = supabase.table("projects")\
        .select("*")\
        .order("created_at", desc=True)\
        .execute()
    return res.data or []

@router.get("/{project_id}")
def get_project(project_id: str):
    res = supabase.table("projects")\
        .select("*")\
        .eq("id", project_id)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return res.data[0]

@router.patch("/{project_id}")
def update_project(project_id: str, data: ProjectUpdate):
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = supabase.table("projects")\
        .update(updates)\
        .eq("id", project_id)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return res.data[0]

@router.delete("/{project_id}")
def delete_project(project_id: str):
    res = supabase.table("projects")\
        .delete()\
        .eq("id", project_id)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}