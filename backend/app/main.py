"""FastAPI entrypoint."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api import admin, agents_routes, cases, insights, packet  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db.database import SessionLocal, init_db  # noqa: E402
from app.db.seed import run_seed  # noqa: E402
from app.logging_setup import configure_logging, get_logger  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    log = get_logger("startup")
    if settings.google_api_key and not os.environ.get("GOOGLE_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = settings.google_api_key
    log.info("init_db")
    init_db()
    if settings.seed_on_start:
        log.info("seeding")
        with SessionLocal() as db:
            run_seed(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Unseen PNE API",
        version="0.1.0",
        description="Multi-agent community operations API.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok", "env": settings.app_env}

    app.include_router(cases.router)
    app.include_router(agents_routes.router)
    app.include_router(packet.router)
    app.include_router(insights.router)
    app.include_router(admin.router)
    return app


app = create_app()
