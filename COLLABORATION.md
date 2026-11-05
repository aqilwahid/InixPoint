# 🤝 Panduan Kolaborasi InixPoint

Dokumen ini untuk memudahkan kolaborasi tim dalam mengembangkan InixPoint secara bersama-sama.

---

## 📊 Status Project

| Aspek | Status | Catatan |
|-------|--------|---------|
| **Phase** | MVP (v0.1) | Fitur dasar sudah berfungsi |
| **Frontend** | ✅ Working | React + Vite + Tailwind |
| **Backend** | ✅ Working | Socket.io + SQLite |
| **Database** | ✅ Working | In-memory + SQLite persistence |
| **Testing** | ⚠️ Manual | Browser testing lokal |
| **Deployment** | 📋 Ready | Vercel + deployment docs siap |

---

## 🏗️ Arsitektur Singkat

```
┌─────────────────────────────────────────────────────────┐
│                    InixPoint                            │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)        Backend (Node.js)   Shared     │
│  ├─ App.tsx             ├─ index.ts         ├─ Types   │
│  ├─ Presenter.tsx       ├─ roomManager.ts   └─ Events  │
│  ├─ Participant.tsx     └─ db.ts                        │
│  ├─ DrawingCanvas.tsx                                   │
│  └─ Tailwind CSS        ┌────────────────────┐          │
│                         │   Socket.io WS     │          │
│                         │ (Real-time Bridge) │          │
│                         └────────────────────┘          │
└─────────────────────────────────────────────────────────┘
         Port: 3000         Port: 4000 / SQLite
```

---

## 🚀 Setup untuk Anggota Tim Baru

### Prerequisites
- Node.js v22.5.0+ (gunakan `nvm` untuk konsistensi)
- Git
- VS Code (recommended)

### 1️⃣ Clone & Setup

```bash
# Clone repo
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint

# ⚠️ PENTING: Pastikan path TANPA spasi!
# Jika di folder dengan spasi, pindahkan:
# Windows: xcopy InixPoint C:\InixPoint /E /I /Y

# Install dependencies
npm install:all
```

### 2️⃣ Jalankan Development Server (2 Terminal)

**Terminal 1 - Backend:**
```bash
npm run dev:server
# Mendengarkan di http://localhost:4000
# Menggunakan tsx watch (auto-reload saat perubahan)
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
# Mendengarkan di http://localhost:3000
# Hot Module Replacement (HMR) enabled
```

### 3️⃣ Test Lokal

1. Buka browser: **http://localhost:3000**
2. Buka incognito/tab lain: **http://localhost:3000**
3. Tab 1: Klik "Buka Ruangan Baru" → catat PIN
4. Tab 2: Klik "Gabung ke Sesi" → masukkan PIN + nama
5. ✅ Jika berhasil konek, siap untuk development

---

## 📁 Struktur Folder & Tanggung Jawab

```
InixPoint/
├── shared/                    # Shared Types & Events (Semua harus tahu)
│   └── src/
│       └── index.ts          # ⚠️ Update di sini jika ada type baru
│
├── server/                    # Backend (🔧 Untuk backend dev)
│   ├── src/
│   │   ├── index.ts          # Entry point + Socket.io handlers
│   │   ├── roomManager.ts    # State management (create, join, submit answer)
│   │   └── db.ts             # SQLite operations
│   └── package.json
│
├── client/                    # Frontend (🎨 Untuk frontend dev)
│   ├── src/
│   │   ├── App.tsx           # Landing page (join/create form)
│   │   ├── components/
│   │   │   ├── Presenter.tsx      # Kontrol + visualisasi jawaban
│   │   │   ├── Participant.tsx    # View peserta
│   │   │   ├── MatchingQuestion.tsx # Untuk question type matching
│   │   │   ├── Leaderboard.tsx    # Score visualization
│   │   │   └── DrawingCanvas.tsx  # HTML5 canvas
│   │   ├── lib/socket.ts     # Socket.io client setup
│   │   └── index.css         # Tailwind
│   └── package.json
│
└── package.json              # Root (npm scripts)
```

---

## 🔄 Git Workflow

### Branch Naming Convention

```
feature/[feature-name]     → Fitur baru (feature/leaderboard)
fix/[bug-name]             → Bug fix (fix/drawing-lag)
docs/[section]             → Dokumentasi (docs/setup)
refactor/[component]       → Cleanup code (refactor/socket-handlers)
```

### Commit Message Format

```
[type] (scope): subject

contoh:
✅ feat(socket): add leaderboard event handler
✅ fix(ui): fix button alignment on mobile
✅ docs(setup): update Windows PATH instructions
✅ refactor(presenter): extract question display logic

Hindari:
❌ update code
❌ fixed
❌ stuff
```

### Pull Request Process

1. **Create branch dari main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Commit & push:**
   ```bash
   git add .
   git commit -m "feat(socket): add leaderboard"
   git push -u origin feature/your-feature
   ```

3. **Buat PR** → Assign reviewer → Merge setelah approve

---

## 💡 Quick Dev Tasks

### Untuk Frontend Dev 🎨

**Tugas Umum:**
- ✅ Tambah component baru di `client/src/components/`
- ✅ Update styling dengan Tailwind
- ✅ Listen Socket.io event di `client/src/lib/socket.ts`
- ✅ Update component state (Zustand atau React State)

**Setup:**
```bash
npm run dev:client
# Vite HMR akan reload otomatis
```

**Cek:**
- Network tab → WebSocket harus `101 Switching Protocols`
- Console → Tidak ada error

---

### Untuk Backend Dev 🔧

**Tugas Umum:**
- ✅ Tambah Socket.io event handler di `server/src/index.ts`
- ✅ Update `RoomManager` untuk logic baru
- ✅ Update `db.ts` untuk persistence baru
- ✅ Update types di `shared/src/index.ts` (SINKRONISASI dengan tim!)

**Setup:**
```bash
npm run dev:server
# tsx watch akan restart otomatis
```

**Cek:**
- Console → Tidak ada error
- RoomManager state terbuat dengan benar
- SQLite query berfungsi (buka `.database/inixpoint.db`)

---

### Untuk Full-Stack Dev 🚀

- Setup keduanya (Terminal 1 + Terminal 2)
- Test Socket.io bridge
- Verifikasi data flow end-to-end

---

## 🧪 Testing Checklist

Sebelum push PR, pastikan:

- [ ] ✅ Tidak ada `console.error()` di browser
- [ ] ✅ WebSocket connected (Network tab di DevTools)
- [ ] ✅ Test lokal di 2 tab (presenter + participant)
- [ ] ✅ Reload page → tetap berfungsi
- [ ] ✅ Tidak ada memory leak (DevTools Performance tab)

---

## 📝 Type System & Shared Types

**JIKA MENAMBAH FEATURE BARU YANG PUNYA DATA BARU:**

1. **Tambah type di `shared/src/index.ts`:**
   ```typescript
   export interface Leaderboard {
     participantId: string;
     name: string;
     score: number;
     timestamp: Date;
   }
   ```

2. **Emit Socket.io event dengan type:**
   ```typescript
   // Backend
   io.to(roomCode).emit('leaderboard-updated', leaderboardData);
   
   // Frontend (listen)
   socket.on('leaderboard-updated', (data: Leaderboard[]) => {
     // Render
   });
   ```

3. **Pastikan client & server sudah sinkron** → Test di 2 tab

---

## 🐛 Common Issues & Solutions

| Problem | Solusi |
|---------|--------|
| `Cannot find module '@inixpoint/shared'` | Run `npm install:all` di root |
| Port 3000/4000 sudah dipakai | `netstat -ano \| findstr :3000` → `taskkill /PID <ID> /F` |
| WebSocket `ECONNREFUSED` | Pastikan backend running (`npm run dev:server`) |
| Path dengan spasi error | Pindah ke path lokal tanpa spasi (C:\InixPoint) |
| HMR tidak bekerja | Refresh browser manual, cek Vite console |
| SQLite locked | Kill node process, restart server |

---

## 📞 Komunikasi Tim

### Channel
- **Code Review:** GitHub PR comments
- **Discussion:** GitHub Issues
- **Quick Chat:** Slack / WhatsApp

### Etiquette
- ✅ PR harus punya deskripsi singkat apa yang berubah
- ✅ Request review sebelum merge
- ✅ Test lokal dulu sebelum push
- ✅ Jangan merge sendiri (tunggu approval)

---

## 🎯 Feature Checklist (MVP Done ✅)

- [x] Room creation dengan PIN
- [x] Real-time Socket.io bridge
- [x] Multiple Choice kuis
- [x] Word Cloud visualization
- [x] Short Answer feed
- [x] Slide Drawing canvas
- [x] SQLite persistence

### Phase 2 Roadmap 📋
- [ ] Leaderboard persistence
- [ ] Timer per question
- [ ] PDF slide viewer
- [ ] Export report ke Excel
- [ ] Authentication
- [ ] Mobile responsiveness improvement

---

## ✨ Tips & Best Practices

1. **Selalu pull latest sebelum development:**
   ```bash
   git checkout main && git pull origin main
   ```

2. **Commit frequently, push regularly:**
   - Jangan hold commit terlalu lama
   - Push daily sebelum pulang

3. **Test di lebih dari 1 device:**
   - Desktop browser (presenter)
   - Mobile browser / tab lain (participant)
   - Latency/lag test

4. **Update documentation:**
   - Jika ada breaking change, update README
   - Jika ada workflow baru, update DEVELOPMENT.md

5. **Code style:**
   - ESLint auto-format dengan Prettier
   - TypeScript strict mode ON
   - Hindari `any` type

---

**Happy Coding! 🚀**

*Terakhir diupdate: 2026-11-05*
