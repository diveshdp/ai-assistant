from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut] = []

    class Config:
        from_attributes = True


class ConversationList(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Memory ────────────────────────────────────────────────────────
class MemoryOut(BaseModel):
    id: UUID
    summary: str
    created_at: datetime

    class Config:
        from_attributes = True
