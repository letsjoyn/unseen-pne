"""Demo endpoints - fetch sample cases for the frontend."""

from __future__ import annotations
import json
from pathlib import Path
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter(prefix="/api/demo", tags=["demo"])

@router.get("/samples")
def get_sample_cases():
    settings = get_settings()
    path = Path(settings.config_dir) / "demo_cases.seed.json"
    if not path.exists():
        return []
    
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Just return the IDs, titles, and intake payloads for the frontend to pick from
    return [
        {
            "id": item.get("id"),
            "title": item.get("title"),
            "payload": item.get("intake_payload")
        }
        for item in data
    ]
