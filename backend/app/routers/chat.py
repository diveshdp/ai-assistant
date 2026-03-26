import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Conversation, Message
from app.schemas.schemas import ChatRequest, ConversationOut
from app.services.openai_service import (
    stream_chat_response,
    generate_conversation_title,
    count_tokens,
)
from app.services.memory_service import get_user_memory
from app.services.rate_limiter import check_rate_limit

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_HISTORY_MESSAGES = 20  # keep last 20 msgs in context


@router.post("")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE streaming chat endpoint.
    - Creates or continues a conversation
    - Injects memory context from Redis/DB
    - Streams GPT-4o response token-by-token
    - Persists user + assistant messages
    """
    await check_rate_limit(str(current_user.id))

    # ── Get or create conversation ──────────────────────────────
    conversation = None
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == request.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            user_id=current_user.id,
            title=None,
        )
        db.add(conversation)
        await db.flush()

    # ── Persist user message ────────────────────────────────────
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message,
        tokens_used=count_tokens(request.message),
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(conversation)

    # ── Build message history for GPT ──────────────────────────
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
    )
    recent_messages = list(reversed(result.scalars().all()))
    openai_messages = [{"role": m.role, "content": m.content} for m in recent_messages]

    # ── Fetch memory context ────────────────────────────────────
    memory_context = await get_user_memory(current_user.id, db)

    # ── Stream response ─────────────────────────────────────────
    async def event_stream() -> AsyncGenerator[str, None]:
        full_response = ""
        conversation_id_str = str(conversation.id)

        # Send conversation_id first so frontend can track it
        yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id_str})}\n\n"

        try:
            async for token in stream_chat_response(openai_messages, memory_context):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # ── Save assistant message ──────────────────────────
            assistant_msg = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
                tokens_used=count_tokens(full_response),
            )
            db.add(assistant_msg)

            # ── Auto-generate title on first exchange ───────────
            if conversation.title is None:
                title = await generate_conversation_title(request.message)
                conversation.title = title

            await db.commit()

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id_str})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
