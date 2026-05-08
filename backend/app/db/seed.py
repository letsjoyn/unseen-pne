"""Seed loader: pulls config JSON files into the registry tables on startup.

The seeding step is idempotent - existing rows are not overwritten unless
the JSON has a higher `version` than the DB row. This keeps the system
fully data-driven; ops can change behavior by editing the JSON files
(or, in production, by writing rows to the DB directly).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import models
from app.logging_setup import get_logger

log = get_logger(__name__)


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(tz=timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(tz=timezone.utc)


def seed_schemes(db: Session, config_dir: Path) -> int:
    path = config_dir / "schemes.seed.json"
    if not path.exists():
        log.warning("schemes_seed_missing", path=str(path))
        return 0

    rows = _load_json(path)
    upserted = 0
    for row in rows:
        existing = db.get(models.Scheme, row["id"])
        version = int(row.get("version", 1))
        if existing and existing.version >= version:
            continue
        scheme = existing or models.Scheme(id=row["id"])
        scheme.name = row["name"]
        scheme.level = row["level"]
        scheme.state = row.get("state")
        scheme.category = row["category"]
        scheme.summary = row.get("summary")
        scheme.eligibility_rules = row["eligibility_rules"]
        scheme.required_documents = row.get("required_documents", [])
        scheme.application_channels = row.get("application_channels", [])
        scheme.estimated_annual_value_inr = row.get("estimated_annual_value_inr")
        scheme.source_url = row["source_url"]
        scheme.source_clause = row.get("source_clause")
        scheme.last_verified_at = _parse_dt(row.get("last_verified_at"))
        scheme.version = version
        scheme.active = row.get("active", True)
        if not existing:
            db.add(scheme)
        upserted += 1
    db.commit()
    return upserted


def seed_prompts(db: Session, config_dir: Path) -> int:
    path = config_dir / "prompts.seed.json"
    if not path.exists():
        log.warning("prompts_seed_missing", path=str(path))
        return 0

    rows = _load_json(path)
    upserted = 0
    for row in rows:
        agent = row["agent"]
        version = int(row.get("version", 1))
        existing = (
            db.query(models.Prompt)
            .filter(models.Prompt.agent == agent, models.Prompt.version == version)
            .one_or_none()
        )
        if existing:
            continue
        db.query(models.Prompt).filter(models.Prompt.agent == agent).update({"active": False})
        db.add(
            models.Prompt(
                agent=agent,
                version=version,
                text=row["text"],
                output_schema=row.get("output_schema"),
                active=True,
            )
        )
        upserted += 1
    db.commit()
    return upserted


def seed_policies(db: Session, config_dir: Path) -> int:
    upserted = 0
    for kind, filename in (
        ("routing", "routing_policies.seed.json"),
        ("followup", "followup_policies.seed.json"),
        ("confidence", "confidence_policies.seed.json"),
        ("feature_flag", "feature_flags.seed.json"),
    ):
        path = config_dir / filename
        if not path.exists():
            continue
        rows = _load_json(path)
        for row in rows:
            key = row["key"]
            existing = (
                db.query(models.Policy)
                .filter(models.Policy.kind == kind, models.Policy.key == key)
                .one_or_none()
            )
            policy = existing or models.Policy(kind=kind, key=key)
            policy.value = row["value"]
            policy.description = row.get("description")
            if not existing:
                db.add(policy)
            upserted += 1
    db.commit()
    return upserted


def run_seed(db: Session) -> dict[str, int]:
    settings = get_settings()
    config_dir = Path(settings.config_dir)
    log.info("seed_start", config_dir=str(config_dir))
    counts = {
        "schemes": seed_schemes(db, config_dir),
        "prompts": seed_prompts(db, config_dir),
        "policies": seed_policies(db, config_dir),
    }
    log.info("seed_done", **counts)
    return counts
