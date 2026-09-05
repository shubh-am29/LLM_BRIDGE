from app.utils.token_counter import count_tokens

def compress_memory(memory_data: dict, categories: list[str] | None = None) -> dict:
    """
    Selects and compresses relevant parts of memory into a compact context dict.
    If categories is None, uses all categories.
    Returns: { "compressed": {...}, "original_tokens": int, "compressed_tokens": int, "reduction_pct": float }
    """
    # Serialise memory to string for token counting
    import json
    original_str = json.dumps(memory_data, indent=2)
    original_tokens = count_tokens(original_str)

    selected = {}
    if categories:
        selected = {k: v for k, v in memory_data.items() if k in categories}
    else:
        selected = memory_data.copy()

    # Remove empty values
    compressed = {}
    for key, value in selected.items():
        if isinstance(value, list) and len(value) > 0:
            compressed[key] = value
        elif isinstance(value, str) and value.strip():
            compressed[key] = value.strip()

    compressed_str = json.dumps(compressed)
    compressed_tokens = count_tokens(compressed_str)

    reduction = 0.0
    if original_tokens > 0:
        reduction = round((1 - compressed_tokens / original_tokens) * 100, 1)

    return {
        "compressed": compressed,
        "original_tokens": original_tokens,
        "compressed_tokens": compressed_tokens,
        "reduction_pct": reduction
    }

def export_as_markdown(memory_data: dict, project_name: str) -> str:
    """Converts memory_data dict into a readable Markdown string."""
    lines = [f"# {project_name} — Project Context\n"]
    label_map = {
        "project_overview": "## Project Overview",
        "requirements": "## Requirements",
        "architecture": "## Architecture",
        "technologies": "## Technologies",
        "decisions": "## Key Decisions",
        "constraints": "## Constraints",
        "current_progress": "## Current Progress",
        "pending_tasks": "## Pending Tasks",
        "important_code": "## Important Code",
        "errors_and_solutions": "## Errors & Solutions",
        "source_references": "## Source References",
    }
    for key, header in label_map.items():
        value = memory_data.get(key)
        if not value:
            continue
        lines.append(header)
        if isinstance(value, list):
            for item in value:
                lines.append(f"- {item}")
        else:
            lines.append(str(value))
        lines.append("")
    return "\n".join(lines)