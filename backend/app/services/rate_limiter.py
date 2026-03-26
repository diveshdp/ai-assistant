from fastapi import HTTPException, status
from app.redis_client import get_redis

RATE_LIMIT_WINDOW = 60       # seconds
RATE_LIMIT_MAX_REQUESTS = 20  # per window per user


async def check_rate_limit(user_id: str) -> None:
    """
    Sliding window rate limiter using Redis.
    Raises 429 if user exceeds RATE_LIMIT_MAX_REQUESTS per RATE_LIMIT_WINDOW seconds.
    """
    redis = await get_redis()
    key = f"ratelimit:{user_id}"

    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, RATE_LIMIT_WINDOW)
    results = await pipe.execute()

    count = results[0]
    if count > RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_MAX_REQUESTS} requests per {RATE_LIMIT_WINDOW}s.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )
