# 🧠 AI Personal Assistant — Full-Stack Project

**Stack:** Next.js 14 · TypeScript · FastAPI (Python) · PostgreSQL · Redis · OpenAI API · Docker · AWS

This is a production-grade AI assistant with persistent memory, conversation history, and real-time streaming — built to showcase Senior Full-Stack skills across the entire stack.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│   Next.js 14 (App Router) + TypeScript + Tailwind CSS      │
│   React Query · Zustand · SSE Streaming                     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST + SSE
┌────────────────────▼────────────────────────────────────────┐
│                    API LAYER (FastAPI)                       │
│   /api/chat  /api/conversations  /api/memory  /api/health   │
│   JWT Auth · Rate Limiting · Pydantic validation            │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
┌──────▼──────┐      ┌────────▼────────────────────────────┐
│  PostgreSQL  │      │           Redis                      │
│  Users       │      │  Session cache · Rate limit store    │
│  Convos      │      │  Memory summaries (TTL 30d)          │
│  Messages    │      └─────────────────────────────────────┘
│  Memory      │
└─────────────┘
       │
┌──────▼──────┐
│  OpenAI API  │
│  GPT-4o      │
│  Embeddings  │
└─────────────┘
```

---

## 📁 Folder Structure

```
ai-assistant/
├── README.md
├── docker-compose.yml          # Local dev: Postgres + Redis
│
├── frontend/                   # Next.js 14 app
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .env.local.example
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx         # Landing / redirect
│       │   ├── chat/
│       │   │   └── page.tsx     # Main chat UI
│       │   └── api/
│       │       └── health/route.ts
│       ├── components/
│       │   ├── ChatWindow.tsx   # SSE streaming chat
│       │   ├── MessageBubble.tsx
│       │   ├── Sidebar.tsx      # Conversation list
│       │   ├── MemoryPanel.tsx  # Memory viewer
│       │   └── ui/              # shadcn components
│       ├── hooks/
│       │   ├── useChat.ts
│       │   ├── useConversations.ts
│       │   └── useMemory.ts
│       ├── store/
│       │   └── chatStore.ts     # Zustand global state
│       └── lib/
│           ├── api.ts           # Axios client
│           └── types.ts         # Shared TypeScript types
│
└── backend/                    # FastAPI Python app
    ├── requirements.txt
    ├── Dockerfile
    ├── .env.example
    ├── alembic.ini
    ├── alembic/
    │   └── versions/
    │       └── 001_init.py      # DB migrations
    └── app/
        ├── main.py              # FastAPI entrypoint
        ├── config.py            # Settings (pydantic-settings)
        ├── database.py          # SQLAlchemy async engine
        ├── redis_client.py      # Redis connection
        ├── models/
        │   ├── user.py
        │   ├── conversation.py
        │   ├── message.py
        │   └── memory.py
        ├── schemas/
        │   ├── chat.py          # Pydantic request/response
        │   └── conversation.py
        ├── routers/
        │   ├── chat.py          # POST /chat (SSE streaming)
        │   ├── conversations.py
        │   └── memory.py
        ├── services/
        │   ├── openai_service.py  # GPT-4o + embeddings
        │   ├── memory_service.py  # Summarize + retrieve memory
        │   └── rate_limiter.py    # Redis-based rate limiting
        └── middleware/
            └── auth.py          # JWT middleware
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Python 3.11+
- Docker Desktop
- OpenAI API key

### 2. Clone & Start Infrastructure
```bash
git clone <your-repo>
cd ai-assistant
docker-compose up -d    # starts Postgres + Redis
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in OPENAI_API_KEY, DATABASE_URL, REDIS_URL, JWT_SECRET

alembic upgrade head     # run DB migrations
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev              # runs on http://localhost:3000
```

---

## 🌐 Deployment (AWS)

| Service | AWS Resource |
|---------|-------------|
| Frontend | Vercel (free tier) or S3 + CloudFront |
| Backend API | ECS Fargate (Docker container) |
| Database | RDS PostgreSQL (t3.micro free tier) |
| Cache | ElastiCache Redis (t3.micro) |
| CI/CD | GitHub Actions → ECR → ECS |

See `docs/deployment.md` for step-by-step AWS deployment guide.

---

## 💡 Key Technical Decisions (Talk Through In Interviews)

1. **Why SSE instead of WebSockets?** — SSE is unidirectional (server → client), simpler to scale, works through load balancers without sticky sessions. WebSockets need connection state management.
2. **Why Redis for memory cache?** — Conversation summaries are expensive to regenerate (LLM call). Redis TTL (30d) gives us fast retrieval without stale data buildup.
3. **Why async SQLAlchemy?** — FastAPI is async-native. Sync ORM calls block the event loop and destroy throughput under load.
4. **Why Zustand over Redux?** — Minimal boilerplate, no Provider wrapping, built-in devtools. Redux overhead isn't justified for this state complexity.
5. **Memory design** — We store rolling summaries, not raw message history, to avoid context window limits while preserving long-term context.

---

## 📊 Performance Targets

- API p99 latency: < 200ms (excl. OpenAI call)
- Time to first token (streaming): < 1s
- Concurrent users: 100+ (Fargate auto-scaling)
- DB query time: < 50ms (indexed on user_id + created_at)
