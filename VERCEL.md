# Vercel Hosting – Connectivity & Deployment Guide

## Project Details

| Property | Value |
|---|---|
| **App name** | performance-enablement |
| **Framework** | Next.js |
| **Build command** | `npm run build` |
| **Output directory** | `.next` (Next.js default) |
| **Node version** | 20.x (recommended) |

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier available)
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- Access to the Git repository for this project

---

## 1. Connecting via Vercel CLI

### Login

```bash
vercel login
```

Follow the browser prompt to authenticate (email, GitHub, GitLab, or Bitbucket).

### Link the project

Run this command from the project root:

```bash
vercel link
```

You will be prompted to:
1. Confirm your Vercel scope / team
2. Select an existing project or create a new one named **performance-enablement**

### Deploy

| Environment | Command |
|---|---|
| Preview (default) | `vercel` |
| Production | `vercel --prod` |

---

## 2. Connecting via Vercel Dashboard (Git Integration)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and authorise access to the repo
3. Select the **performance-enablement** repository
4. Configure the project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: *(leave blank — Next.js default)*
   - **Install Command**: `npm install`
5. Click **Deploy**

Every subsequent push to the connected branch will trigger an automatic deployment.

---

## 3. Environment Variables

Set environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**, or via the CLI:

```bash
vercel env add MY_VARIABLE
```

Variables can be scoped to **Development**, **Preview**, and **Production** environments separately.

---

## 4. Branch / Environment Mapping

| Git branch | Vercel environment | URL pattern |
|---|---|---|
| `main` | Production | `https://<project>.vercel.app` |
| Any other branch | Preview | `https://<project>-<branch>-<hash>.vercel.app` |
| Local (`vercel dev`) | Development | `http://localhost:3000` |

---

## 5. Local Development with Vercel

To run the app locally with Vercel environment variables injected:

```bash
vercel dev
```

Or use the standard Next.js dev server (no Vercel env injection):

```bash
npm run dev
```

---

## 6. Useful CLI Commands

| Command | Description |
|---|---|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel dev` | Run local dev server with env vars |
| `vercel env ls` | List environment variables |
| `vercel logs <url>` | Stream deployment logs |
| `vercel inspect <url>` | Inspect a deployment |
| `vercel rollback` | Roll back to the previous production deployment |

---

## 7. vercel.json Reference

The `vercel.json` in this project:

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

Additional options (add as needed):

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## 8. Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Next.js on Vercel docs: https://vercel.com/docs/frameworks/nextjs
- CLI reference: https://vercel.com/docs/cli
- Environment variables guide: https://vercel.com/docs/projects/environment-variables
