from openai import AsyncOpenAI
from typing import AsyncGenerator, List, Optional
from app.config import settings
import tiktoken

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a helpful, intelligent personal AI assistant with persistent memory. 
You remember context from past conversations and use it to give personalized, relevant responses.
Be concise, direct, and genuinely useful. When you have memory context, reference it naturally.
Today's date: {date}"""


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4  # rough fallback


async def stream_chat_response(
    messages: List[dict],
    memory_context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream GPT-4o response tokens as SSE events."""
    from datetime import date

    system_content = SYSTEM_PROMPT.format(date=date.today().isoformat())
    if memory_context:
        system_content += f"\n\n## Your Memory About This User:\n{memory_context}"

    full_messages = [{"role": "system", "content": system_content}] + messages

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=full_messages,
        stream=True,
        max_tokens=2048,
        temperature=0.7,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def generate_conversation_title(first_message: str) -> str:
    """Generate a short title for a new conversation."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Generate a short (4-6 word) title for a conversation that starts with the following message. Return only the title, no quotes."},
            {"role": "user", "content": first_message[:500]},
        ],
        max_tokens=20,
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()


async def generate_memory_summary(conversation_text: str, existing_memory: Optional[str] = None) -> str:
    """Summarize a conversation into a memory entry."""
    prompt = f"Summarize the key facts, preferences, and context from this conversation that would be useful to remember for future interactions with this user. Be concise (max 200 words).\n\nConversation:\n{conversation_text}"
    if existing_memory:
        prompt += f"\n\nExisting memory to merge with:\n{existing_memory}"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()
