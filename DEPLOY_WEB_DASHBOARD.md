# Deploy to Vercel (Web Dashboard)

Karena PowerShell execution policy blocked, gunakan Vercel web dashboard. Ini lebih straightforward:

## Step 1: Go to Vercel

1. Open https://vercel.com in your browser
2. Sign in (or create account) with GitHub

## Step 2: Import InixPoint Repository

1. Click **"New Project"** button
2. Click **"Import Git Repository"**
3. Find and select **`aqilwahid/InixPoint`** from your GitHub repos
4. Click **"Import"**

## Step 3: Configure Build Settings

Vercel should auto-detect, but verify:

- **Framework**: Vite ✓
- **Build Command**: `npm run install:all && npm run build`
- **Output Directory**: `client/dist`
- **Node.js Version**: 22.x (or latest)
- **Root Directory**: (leave blank)

## Step 4: Set Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL = https://your-server-url.up.railway.app
VITE_SOCKET_IO_URL = https://your-server-url.up.railway.app
```

(We'll setup Railway server after this — for now, you can leave these or use a placeholder like `http://localhost:4000`)

## Step 5: Deploy

Click **"Deploy"** button.

Wait 2-3 minutes. You'll see:
- Build logs in real-time
- Deployment status
- **Live URL** when complete (e.g., `https://inixpoint.vercel.app`)

## After Deploy: Test It

1. Open your Vercel URL in browser
2. Try "Buat Ruangan" (create room) as presenter
3. Copy PIN, open in new tab
4. Join as participant

---

## Setup Railway Server (Next Step)

Once Vercel client is live, setup server on Railway:

1. Go https://railway.app
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub"**
4. Select `aqilwahid/InixPoint`
5. Railway auto-detects Node.js backend
6. Set env var: `NODE_ENV=production`, `PORT=4000`
7. Deploy
8. Get Railway URL (e.g., `https://inixpoint-server.up.railway.app`)
9. Back to Vercel → Update `VITE_API_URL` env vars with Railway URL
10. Vercel auto-redeploys

---

## Done!

Your app is now **live on Vercel + Railway** with real WebSocket support! 🚀
