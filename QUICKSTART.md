# 🚀 InixPoint - Quick Start Guide

**Dokumentasi tercepat untuk memulai development InixPoint.**

---

## ⚡ TL;DR Setup (5 menit)

```bash
# 1. Clone & pindah ke folder lokal (tanpa spasi!)
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint

# 2. Install semua dependencies
npm install:all

# 3. Terminal 1: Backend
npm run dev:server

# 4. Terminal 2: Frontend  
npm run dev:client

# 5. Open browser: http://localhost:3000
# ✅ Done! Siap test.
```

---

## 🎯 Project Overview

| Aspek | Detail |
|-------|--------|
| **Apa?** | Platform presentasi interaktif + kuis real-time untuk kelas/training |
| **Stack** | React 18 + Vite (Frontend) / Express + Socket.io (Backend) / SQLite (Persistence) |
| **Fitur** | Multiple Choice, Word Cloud, Short Answer, Drawing Canvas, Leaderboard, CSV Export |
| **Status** | MVP ✅ Jalan (v0.1) |
| **Deploy** | Siap untuk Vercel / Production |

---

## 📁 Project Structure

```
InixPoint/
├── client/         🎨 Frontend (React + Vite + Tailwind)
├── server/         🔧 Backend (Express + Socket.io + SQLite)
├── shared/         📦 Shared types & interfaces
└── package.json    🚀 Root scripts
```

**Frontend:** `http://localhost:3000`  
**Backend:** `http://localhost:4000`

---

## 🎮 How It Works

```
Presenter (Browser Tab 1)  ←→  Participant (Browser Tab 2)
     ↓                              ↓
     └─── WebSocket (Socket.io) ───┘
               (Real-time)
                  ↓
          Express Server
          (Port 4000)
             ↓        ↓
          Memory   SQLite
        (Rooms)   (Report)
```

**Flow:**
1. Presenter buka ruangan baru → PIN generated
2. Participant join dengan PIN → Socket connected
3. Presenter launch kuis → Dikirim real-time ke semua peserta
4. Peserta jawab → Tally update instant di presenter
5. Presenter close → Data simpan ke SQLite

---

## 🧪 Quick Test (2 tabs)

### Tab 1: Presenter
```bash
1. Open http://localhost:3000
2. Click "Buka Ruangan Baru"
3. Copy PIN (misal: 123456)
4. See QR Code appear
```

### Tab 2: Participant
```bash
1. Open http://localhost:3000 (incognito/private)
2. Click "Gabung ke Sesi"
3. Enter PIN: 123456
4. Enter Name: Peserta 1
5. Click "Masuk"
6. ✅ Connected!
```

### Test Features
- **Multiple Choice:** Select option → Tab 1 tally update
- **Word Cloud:** Type text → Cloud update
- **Drawing:** Draw something → Gallery show
- **Short Answer:** Send text → Feed appear

---

## 💻 Commands Cheat Sheet

```bash
# Setup
npm install:all              # Install semua dependencies

# Development
npm run dev:server           # Backend (Terminal 1)
npm run dev:client           # Frontend (Terminal 2)

# Production Build
npm run build                # Build both client & server
npm run start                # Run production server

# Check Status
git status                   # Git changes
git log --oneline -5         # Recent commits
```

---

## 🔀 Git Workflow (Kolaborasi)

```bash
# Buat branch baru
git checkout -b feature/your-feature

# Buat perubahan + commit
git add .
git commit -m "feat: add leaderboard"

# Push ke GitHub
git push -u origin feature/your-feature

# Buat PR di GitHub → Assign reviewer → Merge
```

---

## 🛑 Common Issues

| Issue | Fix |
|-------|-----|
| `Cannot find module '@inixpoint/shared'` | Run `npm install:all` |
| Port 3000/4000 sudah dipakai | Tutup aplikasi lain atau kill process |
| WebSocket timeout | Pastikan backend running (`npm run dev:server`) |
| Path dengan spasi error | Pindah ke `C:\InixPoint` atau path tanpa spasi |

---

## 📚 Full Documentation

- **Setup Lengkap:** [`COLLABORATION.md`](./COLLABORATION.md)
- **Arsitektur Detail:** [`VISUALIZATION.md`](./VISUALIZATION.md)
- **README Utama:** [`README.md`](./README.md)
- **Development Guide:** [`DEVELOPMENT.md`](./DEVELOPMENT.md)

---

## 🎯 Next Steps

### Untuk Frontend Dev 🎨
```
1. Modifikasi component di client/src/components/
2. Update styling dengan Tailwind
3. Test di http://localhost:3000
4. HMR auto-reload
```

### Untuk Backend Dev 🔧
```
1. Edit socket handlers di server/src/index.ts
2. Update state di server/src/roomManager.ts
3. Add queries di server/src/db.ts
4. tsx watch auto-restart
```

### Untuk Full-Stack Dev 🚀
```
1. Setup kedua terminal (client + server)
2. Test end-to-end Socket.io
3. Verify data persistence di SQLite
```

---

## ✅ Verification Checklist

Sebelum mulai development:

- [ ] Node.js v22.5.0+ installed (`node --version`)
- [ ] npm v10+ installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Path TANPA spasi (bukan Google Drive)
- [ ] `npm install:all` berhasil
- [ ] Backend running tanpa error
- [ ] Frontend running tanpa error
- [ ] Bisa join room di 2 tab
- [ ] WebSocket connected (DevTools → Network)

---

## 📞 Team Communication

- **Code Issues:** GitHub Issues
- **PR Review:** GitHub PR Comments
- **Quick Chat:** Slack / WhatsApp
- **Documentation:** Update `.md` files di repo

---

## 🎓 Learning Resources

- [React 18 Docs](https://react.dev)
- [Socket.io Tutorial](https://socket.io/docs/v4/)
- [Tailwind CSS Cheatsheet](https://tailwindcss.com/docs)
- [Node.js Best Practices](https://nodejs.org/en/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Status:** ✅ MVP Ready  
**Last Updated:** 2026-11-05  
**Questions?** Open an issue on GitHub!
