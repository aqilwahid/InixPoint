# 📖 InixPoint - Documentation Hub

**Pusat dokumentasi lengkap untuk kolaborasi tim InixPoint.**

---

## 🎯 Mulai di Sini

Jika Anda baru pertama kali, ikuti urutan ini:

1. **[⚡ QUICKSTART.md](./QUICKSTART.md)** — Setup 5 menit & test dasar
2. **[🤝 COLLABORATION.md](./COLLABORATION.md)** — Panduan kerja tim
3. **[📊 DASHBOARD.md](./DASHBOARD.md)** — Status & overview project
4. **[🎯 VISUALIZATION.md](./VISUALIZATION.md)** — Arsitektur detail

---

## 📚 Dokumentasi Lengkap

### 🚀 Untuk Mulai Development

| Dokumen | Tujuan | Dibaca Siapa |
|---------|--------|-------------|
| **[QUICKSTART.md](./QUICKSTART.md)** | Setup lokal 5 menit | Semua tim |
| **[README.md](./README.md)** | Overview project | Semua |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Workflow development | Backend/Frontend dev |

### 🤝 Untuk Kolaborasi

| Dokumen | Tujuan | Dibaca Siapa |
|---------|--------|-------------|
| **[COLLABORATION.md](./COLLABORATION.md)** | Git workflow + best practices | Semua developer |
| **[DASHBOARD.md](./DASHBOARD.md)** | Status & metrics project | Project manager |

### 🏗️ Untuk Memahami Teknis

| Dokumen | Tujuan | Dibaca Siapa |
|---------|--------|-------------|
| **[VISUALIZATION.md](./VISUALIZATION.md)** | Arsitektur + data flow | Architect/Lead dev |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Development guide | Backend/Frontend dev |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Deploy ke production | DevOps/Lead dev |

### 🚀 Untuk Deploy

| Dokumen | Tujuan | Dibaca Siapa |
|---------|--------|-------------|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Step-by-step deployment | DevOps engineer |
| **[vercel.json](./vercel.json)** | Vercel config | DevOps |

---

## 🗂️ Folder Structure Explained

```
InixPoint/
│
├─ 📄 QUICKSTART.md           ⭐ START HERE (5 min)
├─ 📄 COLLABORATION.md        👥 Team guidelines
├─ 📄 DASHBOARD.md            📊 Project status
├─ 📄 VISUALIZATION.md        🏗️ Architecture
│
├─ 📄 README.md               📖 Project overview
├─ 📄 DEVELOPMENT.md          🛠️ Dev workflow
├─ 📄 DEPLOYMENT.md           🚀 Production deploy
├─ 📄 vercel.json             ☁️ Vercel config
│
├─ shared/                    📦 Shared types
│  └─ src/index.ts           (Room, Question, Answer, Events)
│
├─ client/                    🎨 React Frontend
│  ├─ src/
│  │  ├─ App.tsx             (Landing page)
│  │  ├─ components/
│  │  │  ├─ Presenter.tsx     (🎯 Control room)
│  │  │  ├─ Participant.tsx   (👥 Student view)
│  │  │  └─ ... (other components)
│  │  └─ lib/socket.ts       (Socket.io setup)
│  └─ package.json
│
├─ server/                    🔧 Express Backend
│  ├─ src/
│  │  ├─ index.ts            (Main + Socket handlers)
│  │  ├─ roomManager.ts      (State management)
│  │  └─ db.ts               (SQLite)
│  └─ package.json
│
└─ .database/                 💾 SQLite database
   └─ inixpoint.db
```

---

## ⚡ Quick Commands

```bash
# Setup
npm install:all                    # Install all dependencies

# Development (2 Terminals)
npm run dev:server                 # Backend (Terminal 1)
npm run dev:client                 # Frontend (Terminal 2)

# Production
npm run build                      # Build both
npm run start                      # Run server

# Git
git status                         # Check changes
git log --oneline -5              # Recent commits
```

---

## 🎯 First Time Checklist

- [ ] **Clone repo:**
  ```bash
  git clone https://github.com/aqilwahid/InixPoint.git
  cd InixPoint
  ```

- [ ] **Install dependencies:**
  ```bash
  npm install:all
  ```

- [ ] **Start dev servers (2 terminal tabs):**
  ```bash
  # Tab 1: Backend
  npm run dev:server
  
  # Tab 2: Frontend
  npm run dev:client
  ```

- [ ] **Test in browser:**
  - Open: `http://localhost:3000`
  - Tab 1 (Presenter): Click "Buka Ruangan Baru"
  - Tab 2 (Participant): Join dengan PIN
  - ✅ Test fitur

- [ ] **Read:**
  - [ ] COLLABORATION.md (git workflow)
  - [ ] VISUALIZATION.md (architecture)

---

## 📋 Role-Based Reading List

### 🎨 Frontend Developer
1. [QUICKSTART.md](./QUICKSTART.md) — Setup
2. [COLLABORATION.md](./COLLABORATION.md) — Git workflow
3. [VISUALIZATION.md](./VISUALIZATION.md) — Component structure
4. Code: `client/src/components/`

### 🔧 Backend Developer
1. [QUICKSTART.md](./QUICKSTART.md) — Setup
2. [COLLABORATION.md](./COLLABORATION.md) — Git workflow
3. [VISUALIZATION.md](./VISUALIZATION.md) — Data flow & Socket events
4. Code: `server/src/`

### 🚀 DevOps / Deployment
1. [DASHBOARD.md](./DASHBOARD.md) — Project status
2. [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment guide
3. [vercel.json](./vercel.json) — Configuration

### 👔 Project Lead / Manager
1. [QUICKSTART.md](./QUICKSTART.md) — Overview
2. [DASHBOARD.md](./DASHBOARD.md) — Status & metrics
3. [COLLABORATION.md](./COLLABORATION.md) — Team workflow

---

## 🔍 Finding Specific Info

### "Bagaimana cara setup?"
→ [QUICKSTART.md](./QUICKSTART.md)

### "Bagaimana workflow git & collaboration?"
→ [COLLABORATION.md](./COLLABORATION.md)

### "Bagaimana arsitektur project?"
→ [VISUALIZATION.md](./VISUALIZATION.md) + [DEVELOPMENT.md](./DEVELOPMENT.md)

### "Status & progress project?"
→ [DASHBOARD.md](./DASHBOARD.md)

### "Bagaimana deploy ke production?"
→ [DEPLOYMENT.md](./DEPLOYMENT.md)

### "Ada error / masalah?"
→ [DEVELOPMENT.md](./DEVELOPMENT.md#-troubleshooting) (Troubleshooting section)

---

## 🆘 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Dependencies tidak install | [Link](./COLLABORATION.md#-common-issues--solutions) |
| Port 3000/4000 sudah dipakai | [Link](./DEVELOPMENT.md#-troubleshooting) |
| WebSocket connection error | [Link](./COLLABORATION.md#-common-issues--solutions) |
| Cannot find module error | [Link](./COLLABORATION.md#-common-issues--solutions) |

---

## 📞 Communication Channels

- **Bug Reports:** GitHub Issues
- **Code Review:** GitHub Pull Requests
- **Quick Chat:** Slack / WhatsApp
- **Status Updates:** [DASHBOARD.md](./DASHBOARD.md)

---

## 🎓 Learning Resources Inside Docs

### Frontend Dev
- React 18 patterns → [DEVELOPMENT.md](./DEVELOPMENT.md)
- Component structure → [VISUALIZATION.md](./VISUALIZATION.md)
- Socket.io integration → [VISUALIZATION.md](./VISUALIZATION.md#-backend-socketio-events)

### Backend Dev
- Socket.io handlers → [VISUALIZATION.md](./VISUALIZATION.md)
- SQLite queries → [DEVELOPMENT.md](./DEVELOPMENT.md)
- RoomManager logic → Code comments in `server/src/roomManager.ts`

### Full-Stack
- Data flow → [VISUALIZATION.md](./VISUALIZATION.md#-data-flow-full-quiz-session)
- Event contracts → [VISUALIZATION.md](./VISUALIZATION.md#-backend-socketio-events)

---

## ✅ Current Status

```
Phase:              ✅ MVP v0.1 (Complete)
Core Features:      ✅ All working
Testing:            ✅ Manual tested
Documentation:      ✅ Complete
Ready for Deploy:   ✅ Yes
Team Ready:         ✅ Yes
```

---

## 🚀 Next Steps

### Immediate
1. **Clone & Setup** → Follow [QUICKSTART.md](./QUICKSTART.md)
2. **Read Team Guidelines** → [COLLABORATION.md](./COLLABORATION.md)
3. **Start Contributing** → Create feature branch

### Short Term (Phase 2)
- Leaderboard persistence
- Timer functionality
- Mobile optimization
- PDF viewer integration

### Medium Term (Phase 3)
- PostgreSQL migration
- Authentication system
- Admin dashboard
- Deployment to cloud

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| **Repository** | [github.com/aqilwahid/InixPoint](https://github.com/aqilwahid/InixPoint) |
| **Active Developers** | 2+ |
| **Lines of Code** | ~3000+ |
| **Components** | 8+ |
| **Features** | 10+ |
| **Test Coverage** | Manual ✅ |
| **Documentation** | Complete ✅ |
| **Ready for Production** | Yes ✅ |

---

## 🔑 Key Principles

```
✅ Do:
├─ Read docs before asking
├─ Commit frequently
├─ Test before pushing
├─ Code review before merging
├─ Communicate clearly
└─ Update docs after changes

❌ Avoid:
├─ Direct push to main
├─ Large commits
├─ Untested code
├─ Merging own PR
├─ Breaking changes without discussion
└─ Outdated documentation
```

---

## 📅 Document Versions

| Document | Last Updated | Version |
|----------|--------------|---------|
| QUICKSTART.md | 2026-11-05 | 1.0 |
| COLLABORATION.md | 2026-11-05 | 1.0 |
| DASHBOARD.md | 2026-11-05 | 1.0 |
| VISUALIZATION.md | 2026-11-05 | 1.0 |
| README.md | 2026-11-05 | 1.0 |
| DEVELOPMENT.md | 2026-11-05 | 1.0 |

---

## 🎯 Quick Reference Card

```
PROJECT: InixPoint
TYPE: Interactive Presentation Platform
STACK: React + Express + Socket.io + SQLite
STATUS: ✅ MVP Ready
TEAM: 2+ Developers

QUICK START:
1. git clone https://github.com/aqilwahid/InixPoint.git
2. npm install:all
3. npm run dev:server (Terminal 1)
4. npm run dev:client (Terminal 2)
5. http://localhost:3000

REPO: github.com/aqilwahid/InixPoint
DOCS: See sections above
SUPPORT: GitHub Issues
```

---

## 🎓 Learning Path

```
Beginner Path:
1. Read QUICKSTART.md
2. Run setup & test locally
3. Read COLLABORATION.md
4. Read VISUALIZATION.md (architecture section)
5. Start with simple tasks

Intermediate Path:
1. Understand DEVELOPMENT.md
2. Review component structure
3. Study Socket.io event flow
4. Start feature development
5. Make first PR

Advanced Path:
1. Study full VISUALIZATION.md
2. Understand database schema
3. Optimization & scaling
4. Deployment & DevOps
5. Architecture decisions
```

---

**Happy Coding! 🚀**

For questions, open an issue on [GitHub](https://github.com/aqilwahid/InixPoint).

*Last Updated: 2026-11-05*
