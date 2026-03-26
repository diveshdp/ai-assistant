# syntax=docker/dockerfile:1.4
FROM python:3.11-slim

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Note: OPENAI_API_KEY should be passed at runtime via environment variables
# See .github/workflows/ci-cd.yml for how secrets are passed to ECS
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
