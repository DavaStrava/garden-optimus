# Garden Optimus - Deployment Checklist

Step-by-step guide to deploy Garden Optimus to Vercel.

---

## Prerequisites

- [ ] GitHub account with the garden-optimus repository
- [ ] Google account (for OAuth)
- [ ] GitHub account (for OAuth - can be same as repo account)

---

## Step 1: Create Vercel Account & Import Project

**Time: 5 minutes**

1. [ ] Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. [ ] Click "Add New Project"
3. [ ] Select the `garden-optimus` repository
4. [ ] Keep default settings:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
5. [ ] Click "Deploy"
6. [ ] **The deploy will fail** - this is expected (missing env vars)
7. [ ] Note your Vercel URL: `https://garden-optimus-xxxxx.vercel.app`

---

## Step 2: Create Vercel Postgres Database

**Time: 10 minutes**

1. [ ] In Vercel Dashboard, go to **Storage** tab
2. [ ] Click **Create Database** → Select **Postgres**
3. [ ] Choose a name (e.g., `garden-optimus-db`)
4. [ ] Select region closest to your users
5. [ ] Click **Create**
6. [ ] Click **Connect to Project** → Select `garden-optimus`
7. [ ] Vercel automatically adds these env vars:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` ← Use this as `DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`
   - `POSTGRES_HOST`

**Verify:**
- [ ] Go to Project → Settings → Environment Variables
- [ ] Confirm `POSTGRES_PRISMA_URL` is present

---

## Step 3: Create Vercel Blob Store

**Time: 5 minutes**

1. [ ] In Vercel Dashboard, go to **Storage** tab
2. [ ] Click **Create Database** → Select **Blob**
3. [ ] Choose a name (e.g., `garden-optimus-blob`)
4. [ ] Click **Create**
5. [ ] Click **Connect to Project** → Select `garden-optimus`
6. [ ] Vercel automatically adds:
   - `BLOB_READ_WRITE_TOKEN`

**Verify:**
- [ ] Go to Project → Settings → Environment Variables
- [ ] Confirm `BLOB_READ_WRITE_TOKEN` is present

---

## Step 4: Create Sentry Project

**Time: 10 minutes**

1. [ ] Go to [sentry.io](https://sentry.io) and sign up (free tier)
2. [ ] Create a new project:
   - Platform: **Next.js**
   - Project name: `garden-optimus`
3. [ ] Copy your DSN (looks like `https://abc123@o456.ingest.sentry.io/789`)
4. [ ] Note your org slug from the URL (e.g., `your-org`)

**Add to Vercel Environment Variables:**
- [ ] `SENTRY_DSN` = your DSN
- [ ] `NEXT_PUBLIC_SENTRY_DSN` = same DSN
- [ ] `SENTRY_ORG` = your org slug
- [ ] `SENTRY_PROJECT` = `garden-optimus`

---

## Step 5: Configure Google OAuth

**Time: 15 minutes**

1. [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
2. [ ] Create a new project or select existing
3. [ ] Go to **APIs & Services** → **Credentials**
4. [ ] Click **Create Credentials** → **OAuth client ID**
5. [ ] Configure consent screen if prompted:
   - User Type: External
   - App name: Garden Optimus
   - Support email: your email
   - Save and continue through scopes (no changes needed)
6. [ ] Create OAuth client:
   - Application type: **Web application**
   - Name: `Garden Optimus Production`
   - Authorized redirect URIs:
     ```
     https://YOUR-PROJECT.vercel.app/api/auth/callback/google
     ```
     (Replace YOUR-PROJECT with your actual Vercel subdomain)
7. [ ] Copy **Client ID** and **Client Secret**

**Add to Vercel Environment Variables:**
- [ ] `GOOGLE_CLIENT_ID` = your client ID
- [ ] `GOOGLE_CLIENT_SECRET` = your client secret

---

## Step 6: Configure GitHub OAuth

**Time: 10 minutes**

1. [ ] Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. [ ] Click **OAuth Apps** → **New OAuth App**
3. [ ] Fill in:
   - Application name: `Garden Optimus`
   - Homepage URL: `https://YOUR-PROJECT.vercel.app`
   - Authorization callback URL:
     ```
     https://YOUR-PROJECT.vercel.app/api/auth/callback/github
     ```
4. [ ] Click **Register application**
5. [ ] Copy **Client ID**
6. [ ] Click **Generate a new client secret** → Copy it

**Add to Vercel Environment Variables:**
- [ ] `GITHUB_CLIENT_ID` = your client ID
- [ ] `GITHUB_CLIENT_SECRET` = your client secret

---

## Step 7: Add Remaining Environment Variables

**Time: 5 minutes**

Go to Vercel → Project → Settings → Environment Variables and add:

### Required

| Variable | Value | How to Generate |
|----------|-------|-----------------|
| `DATABASE_URL` | Copy value from `POSTGRES_PRISMA_URL` | Already added by Vercel |
| `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` | Your Vercel URL |
| `NEXTAUTH_SECRET` | Random 32+ char string | Run: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | From [console.anthropic.com](https://console.anthropic.com) |

### Optional but Recommended

| Variable | Value | Purpose |
|----------|-------|---------|
| `ADMIN_EMAILS` | `your-email@example.com` | Bypass 10-user limit |

---

## Step 8: Redeploy

**Time: 2 minutes**

1. [ ] Go to Vercel → Project → **Deployments**
2. [ ] Find the latest deployment
3. [ ] Click the **⋮** menu → **Redeploy**
4. [ ] Wait for deployment to complete (should succeed now)

---

## Step 9: Run Database Migrations

**Time: 10 minutes**

Run these commands locally:

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Link your local project to Vercel
vercel link

# Pull production environment variables
vercel env pull .env.production

# Run migrations on production database
DATABASE_URL=$(grep POSTGRES_PRISMA_URL .env.production | cut -d '=' -f2-) npx prisma migrate deploy

# Seed the database with 500 plant species
DATABASE_URL=$(grep POSTGRES_PRISMA_URL .env.production | cut -d '=' -f2-) npx prisma db seed
```

**Verify:**
- [ ] No migration errors
- [ ] Seed completes with "500 species" message

**Clean up:**
```bash
# Remove production env file (contains secrets)
rm .env.production
```

---

## Step 10: Verify Deployment

**Time: 10 minutes**

### Basic Checks

1. [ ] Visit `https://YOUR-PROJECT.vercel.app`
2. [ ] Verify the login page loads
3. [ ] Check `/api/health` returns `{"status":"healthy",...}`

### Authentication

4. [ ] Click "Sign in with Google"
5. [ ] Complete OAuth flow
6. [ ] Verify you're redirected to dashboard
7. [ ] Sign out
8. [ ] Sign in with GitHub
9. [ ] Verify it works

### Core Features

10. [ ] Add a new plant (test species dropdown)
11. [ ] Upload a photo for the plant
12. [ ] Verify photo displays (confirms Blob storage works)
13. [ ] Create a care schedule
14. [ ] Log a care activity

### AI Features

15. [ ] Click "Health Assessment" on a plant
16. [ ] Upload a plant photo
17. [ ] Verify AI analysis returns results

### Error Monitoring

18. [ ] Go to Sentry dashboard
19. [ ] Verify the project shows as connected
20. [ ] (Optional) Trigger a test error by visiting `/api/health` while logged in

---

## Step 11: Final Configuration

**Time: 5 minutes**

### Set Your Admin Email

1. [ ] Go to Vercel → Environment Variables
2. [ ] Set `ADMIN_EMAILS` to your email address
3. [ ] This allows you to always register, even at 10 users

### Optional: Custom Domain

If you have a domain:

1. [ ] Go to Vercel → Project → Settings → Domains
2. [ ] Add your domain
3. [ ] Update DNS records as instructed
4. [ ] Update OAuth callback URLs in Google/GitHub to use new domain
5. [ ] Update `NEXTAUTH_URL` env var

---

## Troubleshooting

### Build fails with "Prisma Client not generated"

The build script already handles this, but if it fails:
```bash
# Verify package.json has:
"build": "prisma generate && next build"
```

### OAuth redirect fails

- Verify callback URLs match exactly (including https://)
- Check for trailing slashes
- Ensure env vars are set for the correct environment (Production)

### Database connection timeout

- Use `POSTGRES_PRISMA_URL` (pooled) not `POSTGRES_URL`
- Check if you're in the right Vercel region

### Photos not uploading

- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check Vercel Blob storage is connected to project

### AI assessment fails

- Verify `ANTHROPIC_API_KEY` is set and valid
- Check API key has credits/quota remaining

---

## Post-Deployment

Your app is now live! Next steps:

1. **Share with beta users** - Give them your Vercel URL
2. **Monitor Sentry** - Watch for errors in real usage
3. **Continue development** - Push to `main` for automatic deploys

### Useful Commands

```bash
# View production logs
vercel logs

# Open production database
vercel env pull .env.production
DATABASE_URL=$(grep POSTGRES_PRISMA_URL .env.production | cut -d '=' -f2-) npx prisma studio
rm .env.production  # Clean up after

# Check deployment status
vercel ls
```

---

## Environment Variables Summary

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Copy from `POSTGRES_PRISMA_URL` |
| `NEXTAUTH_URL` | Yes | Your Vercel URL |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud Console |
| `GITHUB_CLIENT_ID` | Yes | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub Developer Settings |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Console |
| `BLOB_READ_WRITE_TOKEN` | Yes | Auto-added by Vercel Blob |
| `SENTRY_DSN` | Recommended | Sentry Dashboard |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Same as SENTRY_DSN |
| `SENTRY_ORG` | Recommended | Your Sentry org slug |
| `SENTRY_PROJECT` | Recommended | `garden-optimus` |
| `ADMIN_EMAILS` | Recommended | Your email(s), comma-separated |

---

## Estimated Total Time: 60-90 minutes

Most time is spent on OAuth configuration and waiting for deployments.
