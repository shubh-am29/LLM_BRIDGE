from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from app.utils.token_counter import count_tokens
import json, re

router = APIRouter(prefix="/projects/{project_id}/sessions", tags=["Agent Sessions"])

def extract_context(raw_content: str) -> dict:
    """
    Simple structured extraction from raw session text.
    Looks for patterns and keywords to pull out useful project info.
    Modular — can be replaced with AI extraction later.
    """
    text = raw_content.lower()
    lines = raw_content.split("\n")

    extracted = {
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

    # Technology keywords to detect
    tech_keywords = [
        "react", "vite", "fastapi", "python", "supabase", "postgresql",
        "typescript", "javascript", "tailwind", "nextjs", "django", "flask",
        "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure",
        "node", "express", "prisma", "graphql", "rest", "api"
    ]

    found_techs = []
    for tech in tech_keywords:
        if tech in text:
            found_techs.append(tech.title())
    if found_techs:
        extracted["technologies"] = list(set(found_techs))

    # Look for completed/done markers
    done_patterns = [
        r"(?:completed?|finished?|done|implemented?|fixed?|added?|created?)[:\s]+(.+)",
        r"✓\s*(.+)",
        r"✅\s*(.+)"
    ]
    for pattern in done_patterns:
        matches = re.findall(pattern, raw_content, re.IGNORECASE)
        for m in matches[:5]:
            item = m.strip()[:120]
            if item and item not in extracted["current_progress"]:
                extracted["current_progress"].append(item)

    # Look for TODO/pending markers
    todo_patterns = [
        r"(?:todo|to-do|pending|need to|should|must|will)[:\s]+(.+)",
        r"[-*]\s*\[\s*\]\s*(.+)"
    ]
    for pattern in todo_patterns:
        matches = re.findall(pattern, raw_content, re.IGNORECASE)
        for m in matches[:5]:
            item = m.strip()[:120]
            if item and item not in extracted["pending_tasks"]:
                extracted["pending_tasks"].append(item)

    # Look for errors/issues
    issue_patterns = [
        r"(?:error|bug|issue|problem|broken|failing?)[:\s]+(.+)",
        r"(?:exception|traceback)[:\s]*\n?(.+)"
    ]
    for pattern in issue_patterns:
        matches = re.findall(pattern, raw_content, re.IGNORECASE)
        for m in matches[:3]:
            item = m.strip()[:120]
            if item and item not in extracted["known_issues"]:
                extracted["known_issues"].append(item)

    # Look for decisions
    decision_patterns = [
        r"(?:decided?|chose?|using|switched? to|replaced?|removed?)[:\s]+(.+)",
        r"(?:decision)[:\s]+(.+)"
    ]
    for pattern in decision_patterns:
        matches = re.findall(pattern, raw_content, re.IGNORECASE)
        for m in matches[:5]:
            item = m.strip()[:120]
            if item and item not in extracted["key_decisions"]:
                extracted["key_decisions"].append(item)

    # Generate a short summary from first 500 chars
    summary_text = raw_content[:500].strip()
    extracted["project_overview"] = summary_text if len(summary_text) > 20 else ""

    return extracted

def generate_diff(current_memory: dict, extracted: dict) -> dict:
    """Compare current memory with extracted data and produce a diff."""
    diff = {}
    list_fields = [
        "requirements", "technologies", "current_progress",
        "key_decisions", "pending_tasks", "known_issues", "agent_instructions"
    ]
    text_fields = ["project_overview", "architecture"]

    for field in list_fields:
        current_items = set(current_memory.get(field, []))
        new_items = set(extracted.get(field, []))
        added = list(new_items - current_items)
        if added:
            diff[field] = {"added": added}

    for field in text_fields:
        current_val = current_memory.get(field, "").strip()
        new_val = extracted.get(field, "").strip()
        if new_val and new_val != current_val:
            diff[field] = {"proposed": new_val, "current": current_val}

    return diff

def apply_diff(current_memory: dict, proposed_memory: dict) -> dict:
    """Merge proposed memory into current memory."""
    merged = current_memory.copy()
    list_fields = [
        "requirements", "technologies", "current_progress",
        "key_decisions", "pending_tasks", "known_issues", "agent_instructions"
    ]
    text_fields = ["project_overview", "architecture"]

    for field in list_fields:
        existing = set(merged.get(field, []))
        proposed = set(proposed_memory.get(field, []))
        merged[field] = list(existing | proposed)

    for field in text_fields:
        proposed_val = proposed_memory.get(field, "").strip()
        if proposed_val:
            merged[field] = proposed_val

    return merged

@router.post("/")
def import_session(project_id: str, data: dict):
    token_count = count_tokens(data.get("raw_content", ""))
    res = supabase.table("agent_sessions").insert({
        "project_id": project_id,
        "agent_name": data.get("agent_name", "Unknown"),
        "title": data.get("title", "Untitled Session"),
        "notes": data.get("notes"),
        "raw_content": data.get("raw_content", ""),
        "source_type": data.get("source_type", "pasted"),
        "status": "imported",
        "summary": data.get("raw_content", "")[:200]
    }).execute()
    return res.data[0]

@router.get("/")
def list_sessions(project_id: str):
    res = supabase.table("agent_sessions")\
        .select("id,project_id,agent_name,title,source_type,status,summary,created_at")\
        .eq("project_id", project_id)\
        .order("created_at", desc=True)\
        .execute()
    return res.data or []

@router.get("/{session_id}")
def get_session(project_id: str, session_id: str):
    res = supabase.table("agent_sessions")\
        .select("*")\
        .eq("id", session_id)\
        .eq("project_id", project_id)\
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return res.data[0]

@router.post("/{session_id}/process")
def process_session(project_id: str, session_id: str):
    # Get session
    sess_res = supabase.table("agent_sessions")\
        .select("*")\
        .eq("id", session_id)\
        .execute()
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sess_res.data[0]

    # Update status to processing
    supabase.table("agent_sessions")\
        .update({"status": "processing"})\
        .eq("id", session_id)\
        .execute()

    # Extract context
    extracted = extract_context(session["raw_content"])

    # Get current memory
    mem_res = supabase.table("project_memory")\
        .select("*")\
        .eq("project_id", project_id)\
        .execute()
    current_memory = mem_res.data[0]["memory_data"] if mem_res.data else {}

    # Generate diff
    diff = generate_diff(current_memory, extracted)

    # Build proposed memory (merged)
    proposed = apply_diff(current_memory, extracted)

    # Save proposed changes
    prop_res = supabase.table("proposed_changes").insert({
        "project_id": project_id,
        "session_id": session_id,
        "proposed_memory": proposed,
        "diff_summary": diff,
        "status": "pending"
    }).execute()

    # Update session status and extracted data
    supabase.table("agent_sessions")\
        .update({
            "status": "processed",
            "extracted_data": extracted,
            "summary": session["raw_content"][:200]
        })\
        .eq("id", session_id)\
        .execute()

    return {
        "session_id": session_id,
        "proposal_id": prop_res.data[0]["id"],
        "extracted": extracted,
        "diff": diff,
        "proposed_memory": proposed
    }