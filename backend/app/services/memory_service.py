import json
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.models import Memory, Message, Conversation
from app.redis_client import get_redis
from app.services.openai_service import generate_memory_summary

MEMORY_TTL = 60 * 60 * 24 * 30  # 30 days


def _redis_key(user_id: UUID) -> str:
    return f"memory:{user_id}"


async def get_user_memory(user_id: UUID, db: AsyncSession) -> Optional[str]:
    """Fetch memory: Redis first, fallback to DB."""
    redis = await get_redis()
    cached = await redis.get(_redis_key(user_id))
    if cached:
        return cached

    result = await db.execute(
        select(Memory)
        .where(Memory.user_id == user_id)
        .order_by(Memory.created_at.desc())
        .limit(1)
    )
    memory = result.scalar_one_or_none()
    if memory:
        await redis.setex(_redis_key(user_id), MEMORY_TTL, memory.summary)
        return memory.summary
    return None


async def update_memory_after_conversation(
    user_id: UUID,
    conversation_id: UUID,
    db: AsyncSession,
) -> None:
    """
    Called after a conversation ends (or every N messages).
    Summarizes the conversation and merges into existing memory.
    """
    # Get conversation messages
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    if not messages:
        return

    conversation_text = "\n".join(
        f"{msg.role.upper()}: {msg.content}" for msg in messages
    )

    # Get existing memory
    existing = await get_user_memory(user_id, db)

    # Generate new summary
    new_summary = await generate_memory_summary(conversation_text, existing)

    # Save to DB
    memory = Memory(
        user_id=user_id,
        summary=new_summary,
        source_conversation_id=conversation_id,
    )
    db.add(memory)
    await db.commit()

    # Invalidate + update Redis cache
    redis = await get_redis()
    await redis.setex(_redis_key(user_id), MEMORY_TTL, new_summary)


async def get_all_memories(user_id: UUID, db: AsyncSession) -> list[Memory]:
    result = await db.execute(
        select(Memory)
        .where(Memory.user_id == user_id)
        .order_by(Memory.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()


async def delete_all_memories(user_id: UUID, db: AsyncSession) -> None:
    await db.execute(delete(Memory).where(Memory.user_id == user_id))
    await db.commit()
    redis = await get_redis()
    await redis.delete(_redis_key(user_id))
