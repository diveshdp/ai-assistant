# AWS Deployment Guide

Deploy the AI Assistant to AWS in ~30 minutes. Total cost: ~$0 on free tier for first 12 months.

---

## Architecture on AWS

```
Internet → CloudFront → S3 (or Vercel for Next.js)
                ↓
         API Gateway (optional) or ALB
                ↓
         ECS Fargate (FastAPI container)
                ↓
    ┌──────────────────────────┐
    │  RDS PostgreSQL (t3.micro)│
    │  ElastiCache Redis (t3.micro)│
    └──────────────────────────┘
```

---

## Step 1: Prerequisites

```bash
# Install AWS CLI
pip install awscli
aws configure  # enter your Access Key ID, Secret, region (us-east-1), output (json)

# Install Vercel CLI (for frontend)
npm install -g vercel
```

---

## Step 2: Create RDS PostgreSQL

```bash
# Create a free-tier PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier ai-assistant-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username dbadmin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --no-multi-az \
  --publicly-accessible \
  --db-name ai_assistant

# Wait for it to be available (~5 min)
aws rds wait db-instance-available --db-instance-identifier ai-assistant-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier ai-assistant-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Your DATABASE_URL will be:
```
postgresql+asyncpg://dbadmin:YOUR_SECURE_PASSWORD@<endpoint>:5432/ai_assistant
```

---

## Step 3: Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id ai-assistant-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# Get endpoint (after ~5 min)
aws elasticache describe-cache-clusters \
  --cache-cluster-id ai-assistant-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text
```

---

## Step 4: Create ECR Repository & Push Backend Image

```bash
# Create ECR repo
aws ecr create-repository --repository-name ai-assistant-backend

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd backend
docker build -t ai-assistant-backend .
docker tag ai-assistant-backend:latest \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/ai-assistant-backend:latest
docker push \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/ai-assistant-backend:latest
```

---

## Step 5: Create ECS Cluster & Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name ai-assistant-cluster

# Create task definition (saves secrets in AWS Secrets Manager - production best practice)
aws secretsmanager create-secret \
  --name ai-assistant/env \
  --secret-string '{
    "OPENAI_API_KEY": "sk-...",
    "JWT_SECRET": "your-production-jwt-secret",
    "DATABASE_URL": "postgresql+asyncpg://...",
    "REDIS_URL": "redis://...",
    "CORS_ORIGINS": "[\"https://your-frontend.vercel.app\"]"
  }'
```

Create the task definition file `.github/ecs-task-definition.json`:
```json
{
  "family": "ai-assistant-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ai-assistant-api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/ai-assistant-backend:latest",
      "portMappings": [{ "containerPort": 8000, "protocol": "tcp" }],
      "essential": true,
      "secrets": [
        { "name": "OPENAI_API_KEY", "valueFrom": "arn:aws:secretsmanager:...:ai-assistant/env:OPENAI_API_KEY::" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:...:ai-assistant/env:JWT_SECRET::" },
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:...:ai-assistant/env:DATABASE_URL::" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:...:ai-assistant/env:REDIS_URL::" },
        { "name": "CORS_ORIGINS", "valueFrom": "arn:aws:secretsmanager:...:ai-assistant/env:CORS_ORIGINS::" }
      ],
      "environment": [{ "name": "APP_ENV", "value": "production" }],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ai-assistant",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://.github/ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster ai-assistant-cluster \
  --service-name ai-assistant-service \
  --task-definition ai-assistant-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

## Step 6: Deploy Frontend to Vercel

```bash
cd frontend
vercel

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-ecs-load-balancer-url

vercel --prod
```

---

## Step 7: Run DB Migrations

```bash
# Port-forward to RDS via a temporary ECS task, then run:
cd backend
DATABASE_URL=postgresql+asyncpg://... alembic upgrade head
```

---

## GitHub Secrets to Set

Go to your repo → Settings → Secrets → Actions, and add:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret |
| `OPENAI_API_KEY` | Your OpenAI key |
| `VERCEL_TOKEN` | From vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From .vercel/project.json |
| `VERCEL_PROJECT_ID` | From .vercel/project.json |

After setting these, every push to `main` auto-deploys. ✅
