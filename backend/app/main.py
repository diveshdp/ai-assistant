from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine
from app.models.models import Base
from app.redis_client import close_redis
from app.routers import chat, conversations, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (in prod use Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="AI Assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(conversations.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "env": settings.app_env}
