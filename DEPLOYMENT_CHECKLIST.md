# InixPoint Deployment Checklist

## ✅ Phase 1: UI Design (COMPLETED)

### Design System
- [x] Inixindo Yogyakarta palette (primary indigo, secondary gold, accent terracotta)
- [x] Typography: Merriweather serif + Inter sans
- [x] Tailwind config extended with custom colors
- [x] Global CSS variables and utility classes

### Components Refactored
- [x] **Landing Page** - Clean, light theme, dual form layout (Join / Create)
- [x] **Presenter Component** - Split layout (left: builder, right: results)
- [x] **Participant Component** - Mobile-first, centered card design
- [x] All components use new color system

---

## ⏳ Phase 2: Server Deployment (READY TO DEPLOY)

### Deploy Client to Vercel

1. **Push to GitHub**
   ```bash
   cd C:\Users\aqilw\OneDrive\Desktop\InixPoint
   git remote add origin https://github.com/aqilwahid/InixPoint.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect Vercel**
   - Go to https://vercel.com/new
   - Import GitHub repo `aqilwahid/InixPoint`
   - Framework: **Vite**
   - Build Command: `npm run install:all && npm run build`
   - Output Directory: `client/dist`
   - Deploy

3. **Note Vercel URL** (e.g., `https://inixpoint.vercel.app`)

### Deploy Server to Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - New Project → Deploy from GitHub repo
   - Select `aqilwahid/InixPoint`
   - Railway auto-detects Node.js

3. **Configure Environment**
   - Variables:
     ```
     NODE_ENV=production
     PORT=4000
     ```

4. **Get Server URL** (e.g., `https://inixpoint-server.up.railway.app`)

### Update Vercel Environment Variables

1. Go to Vercel Project Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL=https://inixpoint-server.up.railway.app
   VITE_SOCKET_IO_URL=https://inixpoint-server.up.railway.app
   ```
3. Redeploy Vercel project

---

## 🧪 Phase 3: Testing

### Test Presenter Flow
```
1. Open https://inixpoint.vercel.app
2. Fill "Judul Sesi"
3. Click "Mulai Sekarang"
4. Copy PIN code
5. Verify QR code generates
```

### Test Participant Flow
```
1. Open https://inixpoint.vercel.app in new window
2. Enter PIN from presenter
3. Enter name
4. Click "Masuk Sekarang"
5. Wait for question (presenter should start one)
```

### Test Socket.io Connection
```
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS"
4. Should see WebSocket connection to Railway server
5. Verify "connected" status
```

### Test Question Types
- [ ] Multiple Choice (A/B/C/D)
- [ ] Word Cloud
- [ ] Short Answer
- [ ] Drawing Canvas

---

## 📋 Post-Deployment Monitoring

### Check Logs

**Vercel:**
- Dashboard → Select project → Deployments → View logs

**Railway:**
- Dashboard → Select project → Logs tab
- Monitor for WebSocket connections and errors

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot connect to server" | CORS or env var wrong | Check `VITE_API_URL` in Vercel env |
| Socket.io timeout | Server unreachable | Verify Railway server is running |
| Build fails on Vercel | npm dependencies | Ensure `npm run install:all` works locally |
| CORS errors | Server not allowing origin | Check Express CORS config in server/src/index.ts |

---

## 🚀 Final Status

| Component | Status | URL |
|-----------|--------|-----|
| Client (Vite + React) | Ready | `https://inixpoint.vercel.app` |
| Server (Express + Socket.io) | Ready | `https://inixpoint-server.up.railway.app` |
| Database (SQLite) | Local | Stored in server process |
| Design System | ✅ Complete | Inixindo palette applied |

---

## Next Steps (Future Phases)

After deployment works:

1. **Add more question types** (Matching, Ranking, Poll)
2. **Real-time leaderboard** with scoring
3. **Question timer** feature
4. **Analytics dashboard** (question stats, time analysis)
5. **Data persistence** (upgrade SQLite → PostgreSQL for cloud)
6. **User authentication** (optional)
7. **Mobile app** (React Native)

---

## Quick Deploy Script

```bash
# From InixPoint root
git push origin main

# Wait for Vercel to build & deploy
# Then test at https://inixpoint.vercel.app
```

**Deployment time:** ~2-3 minutes
