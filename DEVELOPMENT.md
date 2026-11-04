# Pengembangan InixPoint

Panduan untuk developer yang ingin berkontribusi atau mengembangkan fitur baru.

---

## 🏗️ Arsitektur Keseluruhan

```
Peserta (Browser)          Presenter (Browser)
    |                           |
    └──────── Socket.io ────────┘
                 |
              Express Server
                 |
            ┌────┴────┐
            |          |
         Memory      SQLite
        (Rooms)    (Laporan)
```

### Layer Stack:

1. **Frontend** (`client/src/`)
   - React components: `App`, `Presenter`, `Participant`, `DrawingCanvas`
   - Socket.io event listener → Zustand state (jika perlu expand)
   - Tailwind CSS styling

2. **Backend** (`server/src/`)
   - Express app → Socket.io namespace untuk broadcast
   - `RoomManager` untuk in-memory room state
   - `db.ts` untuk SQLite query (laporan & persistence)

3. **Shared** (`shared/src/`)
   - TypeScript interfaces & type definitions
   - Socket.io event contract

---

## 🔌 Socket.io Event Flow

### Presenter Flow:
```
Presenter: create-room
    ↓
Server: generates room code + stores in RoomManager
    ↓
Presenter: start-question (dengan question data)
    ↓
Server: emit 'question-started' ke semua di room
    ↓
Peserta: terima question, render UI
    ↓
Peserta: submit-answer
    ↓
Server: store answer + emit 'answer-received' ke room
    ↓
Presenter: terlihat di answer tally (Multiple Choice, Word Cloud, etc)
    ↓
Presenter: close-question
    ↓
Server: saveRoomReport() → SQLite, emit 'question-closed'
```

---

## 🛠️ Development Workflow

### 1. Setup Local Environment

```bash
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint

# Pastikan di path lokal (C:\InixPoint), bukan Google Drive!
npm install:all
```

### 2. Run Dev Servers (2 terminals)

**Terminal A - Backend:**
```bash
npm run dev:server
# Watches server/src/*.ts, restarts on change (via tsx watch)
```

**Terminal B - Frontend:**
```bash
npm run dev:client
# Vite dev server dengan HMR (hot reload)
```

### 3. Code Structure

**Backend - `server/src/`:**

- `index.ts` — Express app + Socket.io setup, event handlers
- `roomManager.ts` — State management (create, join, start question, submit answer, etc)
- `db.ts` — SQLite initialization + query functions (saveRoomReport, getRoomSummary)

**Frontend - `client/src/`:**

- `App.tsx` — Landing page logic (dual forms: join + create)
- `components/Presenter.tsx` — Presenter control room
- `components/Participant.tsx` — Participant view + question UI
- `components/DrawingCanvas.tsx` — HTML5 canvas component
- `lib/socket.ts` — Socket.io client initialization
- `index.css` — Tailwind styles

**Shared - `shared/src/`:**

- `index.ts` — Type definitions (Room, Question, Answer, Participant, QuestionType, Socket.io events)

---

## 🧪 Testing

### Manual Testing (Lokal)

1. **Presenter flow:**
   - Buka `localhost:3000`
   - Klik "Buka Ruangan Baru"
   - Catat PIN yang muncul

2. **Participant flow:**
   - Buka incognito tab → `localhost:3000`
   - Klik "Gabung ke Sesi"
   - Masukkan PIN + nama

3. **Test each question type:**
   - Multiple Choice: tally chart harus terupdate real-time
   - Word Cloud: word frequency harus sorted
   - Short Answer: feed harus muncul di grid
   - Slide Drawing: canvas + gallery harus berfungsi

### Browser DevTools

- **Network tab:** Pastikan WebSocket (Socket.io) koneksi aktif
- **Console tab:** Cek error atau warning
- **React DevTools:** Inspect component state jika sudah integrate Zustand

---

## 📦 Build & Deploy

### Build untuk Production

```bash
npm run build
```

Output:
- `server/dist/` — Compiled server
- `client/dist/` — Built React app (static files)

### Environment Variables

Buat `.env` di root / masing-masing folder:

```env
# server/.env (optional)
PORT=4000
NODE_ENV=production

# client/.env (optional)
VITE_SERVER_URL=https://api.inixpoint.app
VITE_ENVIRONMENT=production
```

---

## 🚀 Fitur Roadmap

### ✅ MVP (v0.1 - Sekarang)
- [x] Room creation & join dengan PIN
- [x] Multiple Choice kuis dengan tally real-time
- [x] Word Cloud visualisasi
- [x] Short Answer feed
- [x] Slide Drawing canvas
- [x] In-memory room state
- [x] SQLite persistence untuk laporan

### 📋 Phase 2 (v0.2)
- [ ] User authentication (login peserta)
- [ ] Persistent rooms (restart server tetap ada)
- [ ] PDF slide viewer di presenter
- [ ] Timer countdown per question
- [ ] Gamification: points & leaderboard persistence
- [ ] Export report ke Excel (via exceljs)

### 🎯 Phase 3 (v0.3+)
- [ ] Livestream integration (OBS, YouTube)
- [ ] Mobile app (React Native)
- [ ] PostgreSQL upgrade (from SQLite)
- [ ] Admin dashboard (analytics, user management)
- [ ] Cloud deployment (Docker, AWS/GCP)
- [ ] Multiplayer presenter mode
- [ ] Recording & playback

---

## 🐛 Debug Tips

### Socket.io Connection Issues

**Client side:**
```typescript
// client/src/lib/socket.ts
socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.log('❌ Error:', err));
socket.on('disconnect', () => console.log('Disconnected'));
```

**Server side:**
```typescript
// server/src/index.ts
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket] Disconnected: ${socket.id}`));
});
```

### Database Debug

```typescript
// server/src/db.ts
const session = db.prepare('SELECT * FROM quiz_sessions WHERE code = ?').all('123456');
console.log('Sessions found:', session);
```

---

## 📚 Dependencies Explained

| Package | Purpose | Notes |
|---------|---------|-------|
| Express | HTTP server framework | Ringan, fast |
| Socket.io | Real-time WebSocket | Fallback ke polling |
| Vite | Frontend bundler | ESM-first, dev speed |
| React | UI library | v18.3 |
| TypeScript | Type safety | Strict mode |
| Tailwind CSS | Styling | Utility-first |
| qrcode.react | QR code generator | Simple, no deps |
| Lucide React | Icons | SVG-based, tree-shakeable |

---

## 🔐 Security Considerations (TODO)

- [ ] PIN format validation (6-digit only)
- [ ] Room code brute-force protection
- [ ] CORS whitelist untuk production
- [ ] Input sanitization (DOMPurify untuk user text)
- [ ] Rate limiting per socket
- [ ] HTTPS/WSS untuk production

---

## 📖 References

- [Express.js Docs](https://expressjs.com/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind Docs](https://tailwindcss.com/)

---

Terima kasih telah berkontribusi pada InixPoint! 🙌
