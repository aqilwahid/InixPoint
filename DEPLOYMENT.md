# InixPoint - Deployment Guide

## Quick Start (Development)

```bash
# Install all dependencies
npm run install:all

# Terminal 1: Start backend server (port 4000)
npm run dev:server

# Terminal 2: Start frontend dev server (port 5173)
npm run dev:client
```

Open `http://localhost:5173` in your browser.

---

## Deployment to Vercel (Client + Server)

### Step 1: Prepare GitHub Repository
```bash
git add .
git commit -m "feat: Inixindo design system and UI refresh"
git push origin main
```

### Step 2: Deploy Client to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"** → Import your GitHub repo
3. Framework: **Vite**
4. Build Command: `npm run install:all && npm run build`
5. Output Directory: `client/dist`
6. Root Directory: (leave blank)
7. Click **Deploy**

After deployment, note your Vercel URL (e.g., `https://inixpoint.vercel.app`)

### Step 3: Configure Environment Variables

In Vercel project settings:

**Settings → Environment Variables**

Add:
- `VITE_API_URL`: Your server URL (see Step 4 below)
- `VITE_SOCKET_IO_URL`: Your server URL for Socket.io

---

## Deployment to Railway (Server Only)

Railway supports WebSocket connections better than Vercel for long-running Socket.io processes.

### Step 1: Create Railway Account
Visit [railway.app](https://railway.app) and sign up with GitHub

### Step 2: Create New Project
1. Click **New Project** → **Deploy from GitHub repo**
2. Select your InixPoint repo
3. Railway auto-detects it's a Node.js project

### Step 3: Configure
In Railway dashboard, under **Variables**:

```
NODE_ENV=production
PORT=4000
```

### Step 4: Get Your Server URL
Railway generates a domain like: `https://inixpoint-server-prod.up.railway.app`

Update your Vercel environment variable:
- `VITE_API_URL`: `https://inixpoint-server-prod.up.railway.app`
- `VITE_SOCKET_IO_URL`: `https://inixpoint-server-prod.up.railway.app`

---

## Alternative: Deploy Both to Railway

If you prefer a single hosting provider:

1. Deploy main app to Railway (same as above)
2. Update client Socket.io config to point to Railway server URL

---

## Testing After Deployment

### Test Presenter:
```
https://your-vercel-url.vercel.app
→ Click "Buat Ruangan" button
→ Note the PIN code
```

### Test Participant:
```
Open new browser tab/window
→ https://your-vercel-url.vercel.app
→ Enter PIN code from presenter
→ Join session
```

### Verify Socket.io Connection:
Open browser DevTools → Network tab → WS filter
Should see WebSocket connection to your server

---

## Troubleshooting

### "Cannot connect to server"
- Check `VITE_API_URL` is correct in Vercel env vars
- Ensure server is running on Railway/Render
- Check CORS settings in server/src/index.ts

### Socket.io timeouts
- Railway may have firewall issues; check logs
- Try Render.com as alternative (also WebSocket-friendly)

### Build fails
- Ensure `npm run install:all` works locally first
- Check Node.js version: v22.5.0+
- Check npm version: v10+

---

## Environment Variables Checklist

**Client (.env or Vercel)**
```
VITE_API_URL=https://your-server-url.up.railway.app
VITE_SOCKET_IO_URL=https://your-server-url.up.railway.app
```

**Server (.env or Railway)**
```
NODE_ENV=production
PORT=4000
```
