# 🔒 Security & Secrets Management

## ⚠️ Important: Never Commit Sensitive Data

This project uses GitHub Secrets to securely manage sensitive credentials. **NEVER COMMIT `.env` FILES TO GITHUB**.

---

## 🛡️ What's Protected

The following are configured in `.gitignore` and will never be committed:

- `backend/.env` (API keys, database passwords, JWT secrets)
- `frontend/.env.local` (API endpoints with local overrides)
- `node_modules/`, `venv/`, and other build artifacts

---

## 📋 Setup Guide: GitHub Secrets

### Step 1: Add Secrets to GitHub

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/ai-assistant`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add:

| Secret Name | Value | Source |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | AWS IAM Console |
| `VERCEL_TOKEN` | Your Vercel token | [Vercel Dashboard](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your Vercel org ID | Vercel Dashboard |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Vercel Dashboard |

### Step 2: How Secrets are Used in CI/CD

The [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) file automatically uses these secrets:

```yaml
# In Tests:
- name: Run tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    
# These secrets are NEVER logged or printed
# They're injected securely at runtime
```

---

## 🚀 Local Development Setup

### For Backend

1. **Create a local `.env` file** (never commit this):
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Edit `backend/.env` and add your keys**:
   ```env
   OPENAI_API_KEY=sk-your-actual-key-here
   DATABASE_URL=postgresql+asyncpg://devuser:devpassword@localhost:5432/ai_assistant
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. **Start the app**:
   ```bash
   source venv/bin/activate  # Mac/Linux
   # OR: venv\Scripts\activate  # Windows
   uvicorn app.main:app --reload --port 8000
   ```

### For Frontend

1. **Create `.env.local`** (never commit this):
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

2. **Edit `frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

---

## ✅ Security Best Practices

### ✔️ DO:
- ✅ Use `.gitignore` to prevent committing `.env` files
- ✅ Store secrets in GitHub Secrets for CI/CD
- ✅ Rotate API keys regularly
- ✅ Use different keys for dev/staging/production
- ✅ Review git history before pushing: `git log --oneline -n 10`
- ✅ Use environment variables at runtime, not build time

### ❌ DON'T:
- ❌ Commit `.env` files to GitHub
- ❌ Share API keys via Slack, email, or any chat
- ❌ Log sensitive data (check stdout/stderr)
- ❌ Hardcode secrets in source code
- ❌ Use the same key across environments
- ❌ Pass secrets as Docker build arguments (use runtime env instead)

---

## 🔍 If You Accidentally Committed a Secret

1. **Immediately revoke the compromised key**:
   - OpenAI: Delete key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - AWS: Delete access key from AWS IAM
   - Vercel: Regenerate token in Dashboard

2. **Remove it from git history**:
   ```bash
   # Use git-filter-branch or BFG Repo-Cleaner
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch backend/.env' HEAD
   git push origin --force --all
   ```

3. **Generate new credentials** and add to GitHub Secrets

---

## 📚 References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [AWS IAM User Guide](https://docs.aws.amazon.com/iam/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## 🤝 For Team Members

When you clone this repo and want to run it locally:

```bash
# 1. Clone the repo
git clone https://github.com/diveshdp/ai-assistant.git
cd ai-assistant

# 2. Set up backend
cd backend
cp .env.example .env
# ← Edit .env and add YOUR API keys (don't share them!)
python -m venv venv
source venv/bin/activate  # Mac/Linux or: venv\Scripts\activate  (Windows)
pip install -r requirements.txt

# 3. Set up Docker
cd ..
docker-compose up -d

# 4. Run backend
cd backend
uvicorn app.main:app --reload --port 8000

# 5. Set up frontend (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

---

**Last Updated:** March 25, 2026
