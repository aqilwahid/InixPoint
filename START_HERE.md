# 🎬 InixPoint - START HERE! 👋

**File ini adalah pintu masuk project. Baca ini dulu sebelum mulai.**

---

## 🎯 Apa Itu InixPoint?

**Platform presentasi interaktif & kuis real-time untuk kelas/training.**

```
Presenter (di layar/proyektor)
        ↑
        │ Socket.io (WebSocket)
        ↓
Peserta (di HP mereka)
```

**Contoh:**
- Presenter: Luncurkan soal Multiple Choice
- Peserta: Jawab langsung di HP
- Presenter: Lihat grafik jawaban **real-time**
- Selesai: Semua data otomatis tersimpan

---

## ✅ Status Sekarang

```
Phase:              MVP v0.1 ✅ SELESAI
Features:           10+ working ✅
Testing:            Manual tested ✅
Documentation:      LENGKAP ✅
Ready for Deploy:   YES ✅
Ready for Team:     YES ✅
```

---

## ⚡ Setup 5 Menit

### 1️⃣ Clone & Install
```bash
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint
npm run install:all
```
⏱️ ~ 2 menit

### 2️⃣ Jalankan (2 Terminal)

**Terminal 1 - Backend:**
```bash
npm run dev:server
```
Mendengarkan di `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```
Mendengarkan di `http://localhost:3000`

⏱️ ~ 30 detik (auto-reload enabled)

### 3️⃣ Test
- Buka: `http://localhost:3000` (Tab 1: Presenter)
- Buka: `http://localhost:3000` (Tab 2: Participant)
- Presenter: Click "Buka Ruangan Baru" → Catat PIN
- Participant: Click "Gabung ke Sesi" → Masukkan PIN
- ✅ Kalau berhasil konek = **Ready to develop!**

---

## 📚 Dokumentasi (Pilih Sesuai Kebutuhan)

```
├─ 📖 INDEX.md              ← Navigation hub (baca dulu sebelum mulai)
├─ ⚡ QUICKSTART.md         ← Setup 5 menit (sudah ada di atas)
├─ 🤝 COLLABORATION.md      ← Git workflow & team guidelines
├─ 📊 DASHBOARD.md          ← Project status & metrics
├─ 🏗️ VISUALIZATION.md      ← Architecture & data flow (DETAIL)
│
├─ 📖 README.md             ← Project overview
├─ 🛠️ DEVELOPMENT.md        ← Development workflow
├─ 🚀 DEPLOYMENT.md         ← Production deployment
└─ ☁️ vercel.json           ← Vercel configuration
```

**Rekomendasi baca order:**
1. File ini (START HERE) ✅
2. [INDEX.md](./INDEX.md) — Navigation hub
3. [COLLABORATION.md](./COLLABORATION.md) — Team workflow
4. [VISUALIZATION.md](./VISUALIZATION.md) — Architecture detail

---

## 🏗️ Project Structure (Simple View)

```
InixPoint/
├── client/            🎨 Frontend (React + Vite + Tailwind)
│   └── src/
│       ├── App.tsx
│       └── components/
│           ├── Presenter.tsx      ← Main control room
│           ├── Participant.tsx    ← Student view
│           └── ... (other components)
│
├── server/            🔧 Backend (Express + Socket.io)
│   └── src/
│       ├── index.ts              ← Main entry + Socket handlers
│       ├── roomManager.ts        ← State management
│       └── db.ts                 ← SQLite operations
│
└── shared/            📦 Shared types & events
    └── src/index.ts
```

**Ports:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Database: `.database/inixpoint.db` (auto-created)

---

## 🎯 Features (MVP - Semuanya Berfungsi)

| # | Feature | Status |
|---|---------|--------|
| 1 | Room creation (PIN + QR) | ✅ |
| 2 | Join room | ✅ |
| 3 | Multiple Choice quiz | ✅ |
| 4 | Word Cloud | ✅ |
| 5 | Short Answer | ✅ |
| 6 | Drawing Canvas | ✅ |
| 7 | Leaderboard | ✅ (Basic) |
| 8 | Real-time Socket.io | ✅ |
| 9 | SQLite persistence | ✅ |
| 10 | CSV export | ✅ |

---

## 💡 Bagaimana Cara Berkontribusi?

### 1. Setup lokal (sudah di atas ⬆️)

### 2. Create branch baru
```bash
git checkout -b feature/your-feature
```

### 3. Develop & test lokal
```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

### 4. Commit & push
```bash
git add .
git commit -m "feat: add leaderboard"
git push -u origin feature/your-feature
```

### 5. Buat PR di GitHub
- Go to [github.com/aqilwahid/InixPoint](https://github.com/aqilwahid/InixPoint)
- Click "Pull Requests" → "New Pull Request"
- Assign reviewer
- Tunggu approval → merge

---

## 🔀 Git Workflow

```
main (production-ready)
  ↑
  ← [PR] feature/your-feature (development)
       ↑
       ← [git push] Local development
```

**Rules:**
- ✅ Selalu buat branch baru (jangan push ke main)
- ✅ Commit message harus clear (contoh: "feat: add timer")
- ✅ Test lokal sebelum push
- ✅ Tunggu PR approval sebelum merge

---

## 🔧 Tech Stack

```
Frontend         Backend          Database
├─ React 18      ├─ Node.js 24    ├─ SQLite
├─ Vite          ├─ Express       └─ node:sqlite
├─ TypeScript    ├─ Socket.io       (built-in)
├─ Tailwind CSS  ├─ TypeScript
├─ Zustand       └─ CORS
├─ Lucide Icons
└─ qrcode.react
```

**Why these?**
- React → Fast, modern UI
- Vite → Lightning-fast development
- Socket.io → Real-time communication
- SQLite → Zero-dependency persistence
- TypeScript → Type safety

---

## 🧪 Testing Checklist

Sebelum push PR, pastikan:

```
☑️ Setup berhasil (npm install:all)
☑️ Backend running tanpa error (npm run dev:server)
☑️ Frontend running tanpa error (npm run dev:client)
☑️ Bisa create room & join dari 2 tab
☑️ Feature yang ditambah berfungsi
☑️ Tidak ada console error (DevTools)
☑️ WebSocket connected (Network tab di DevTools)
☑️ Data tersimpan di SQLite
```

---

## 🆘 Masalah Umum

| Problem | Fix |
|---------|-----|
| `Cannot find module` | Run: `npm run install:all` |
| Port 3000 sudah dipakai | Tutup aplikasi lain atau: `netstat -ano \| findstr :3000` → `taskkill /PID <ID> /F` |
| WebSocket ECONNREFUSED | Pastikan backend running: `npm run dev:server` |
| Path dengan spasi error | Pindahkan ke path tanpa spasi, contoh: `C:\InixPoint` |

---

## 📞 Team Communication

- **Bugs/Features:** GitHub Issues
- **Code Review:** GitHub Pull Requests
- **Quick Chat:** Slack / WhatsApp
- **Status:** [DASHBOARD.md](./DASHBOARD.md)

---

## 🚀 Next Steps

### Sekarang:
1. ✅ Clone repo
2. ✅ Setup lokal (npm install:all)
3. ✅ Run dev servers (2 terminals)
4. ✅ Test di browser (http://localhost:3000)

### Kemudian:
1. 📖 Baca [COLLABORATION.md](./COLLABORATION.md) — Team workflow
2. 📖 Baca [VISUALIZATION.md](./VISUALIZATION.md) — Architecture
3. 🔀 Buat feature branch
4. 💻 Mulai coding
5. 📤 Push & buat PR

### Phase 2 (Roadmap):
- [ ] Leaderboard persistence
- [ ] Timer per question
- [ ] Mobile optimization
- [ ] PDF viewer

---

## 📊 Project Info

| Item | Detail |
|------|--------|
| **GitHub** | [aqilwahid/InixPoint](https://github.com/aqilwahid/InixPoint) |
| **Version** | v0.1.0 (MVP) |
| **Status** | ✅ Ready for collaboration |
| **License** | MIT |
| **Author** | Aqil Wahid |
| **Created** | 2026 |

---

## 🎓 Resources

- **React Docs:** https://react.dev
- **Socket.io:** https://socket.io/docs/v4/
- **Tailwind:** https://tailwindcss.com
- **Vite:** https://vitejs.dev
- **Node.js:** https://nodejs.org/docs/

---

## ✨ Tips

```
✅ DO:
├─ Read documentation
├─ Test locally first
├─ Commit frequently
├─ Use clear commit messages
└─ Communicate with team

❌ DON'T:
├─ Push directly to main
├─ Commit without testing
├─ Use vague commit messages
├─ Work without branching
└─ Merge your own PR
```

---

## 🎯 Quick Reference Card

```
PROJECT:      InixPoint
WHAT:         Interactive presentation platform
STATUS:       ✅ MVP ready
TEAM:         2+ developers
SETUP TIME:   5 minutes
REPO:         github.com/aqilwahid/InixPoint

QUICK START:
1. git clone https://github.com/aqilwahid/InixPoint.git
2. cd InixPoint
3. npm run install:all
4. npm run dev:server     (Terminal 1)
5. npm run dev:client     (Terminal 2)
6. Open http://localhost:3000

DOCS START:
→ Read: INDEX.md
→ Then: COLLABORATION.md
→ Then: VISUALIZATION.md
```

---

## ❓ Pertanyaan Umum

**Q: Berapa lama setup?**  
A: ~5 menit (install dependencies tergantung internet)

**Q: Bisa develop offline?**  
A: Ya! Semuanya lokal (Socket.io + SQLite)

**Q: Bisa test dengan HP?**  
A: Ya! Cari IP laptop, akses `http://[IP]:3000` dari HP

**Q: Ada database eksternal?**  
A: Tidak sekarang (SQLite lokal), tapi bisa upgrade ke PostgreSQL nanti

**Q: Apakah sudah siap production?**  
A: Ya! Deployment docs sudah ready di [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🎉 Siap Mulai?

### Step 1: Clone
```bash
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint
```

### Step 2: Install
```bash
npm run install:all
```

### Step 3: Run (2 Terminals)
```bash
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
```

### Step 4: Open Browser
```
http://localhost:3000
```

### Step 5: Read Docs
→ [INDEX.md](./INDEX.md)

---

**Good luck! Happy coding! 🚀**

*Questions? → GitHub Issues*  
*Ready to contribute? → Read [COLLABORATION.md](./COLLABORATION.md)*  
*Want to understand architecture? → Read [VISUALIZATION.md](./VISUALIZATION.md)*

---

**Last Updated:** 2026-11-05  
**Status:** ✅ Ready for Team Collaboration
