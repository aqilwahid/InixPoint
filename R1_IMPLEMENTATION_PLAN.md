# R1 — Stabilisasi & Deploy Live — Rencana Implementasi

**Target:** Siap untuk deploy live ke Vercel + Railway dengan validasi 200 peserta simulasi.

---

## Status Quo (Code Analysis)

### ✅ Yang sudah ada
- **Socket.io** koneksi client-server + event handlers
- **Room manager** in-memory dengan state peserta, pertanyaan, jawaban
- **Gamifikasi dasar**: skor, bintang, kecepatan
- **CSV export** via `/api/reports/:code/csv`
- **Health check** `/api/health`
- **Tipe aktivitas R0**: MC, word cloud, short answer, drawing, matching, quick poll
- **Real-time update** participant-joined, answer-received, participant-updated
- **Self-check server** test-award-star.ts

### ⚠️ Gap untuk R1

| ID | Fitur | Status | Blocker? |
|---|---|---|---|
| **U-02** | Token host (FR-2) | ⬜ | Ya, P0 |
| **P-03** | Timer server-side + auto-close (FR-8) | 🟡 (UI ada, server tidak) | Ya, P0 |
| **F-05** | Reconnect 5 menit (FR-9) | ⬜ | Ya, P0 |
| **F-06** | Close room eksplisit | 🟡 (hanya saat disconnect) | Tidak, P1 |
| **F-10** | Kick peserta + filter kata | ⬜ | Tidak, P1 |
| **Rate limit** | Join, submit, award | ⬜ | Tidak, P1 |
| **WebSocket live** | Deploy Vercel + Railway | ⬜ | Ya, P0 |
| **Beban 200 peserta** | Uji & capture metrik | ⬜ | Ya, P0 |

---

## Rencana Task (prioritas P0 dulu)

### P0 Tasks (Blocker untuk R1)

#### Task 1: Token Host (U-02, FR-2) — 2-3 jam
**Tujuan:** Hanya host yang dapat start-question, close-question, award-star. Validasi via token, bukan hanya socket.id.

**Desain:**
- `createRoom()` → generate random token (16 hex char) → return ke presenter
- Token disimpan di `room.hostToken`; presenter simpan di state lokal/localStorage
- Setiap event presenter (start-question, close-question, award-star) bawa token
- Server validasi: `room.hostToken === payload.hostToken`, reject kalau tidak cocok
- Peserta yang reconnect tidak perlu host token

**Kode changes:**
1. `roomManager.ts`:
   - `createRoom()` → generate hostToken
   - `startQuestion()`, `closeQuestion()`, `awardStar()` → tambah parameter hostToken + validasi
   - Throw error "Host token invalid" jika tidak cocok

2. `index.ts` (server):
   - Event handler tambah validasi hostToken
   - Log security: "Host token mismatch / invalid"

3. `App.tsx` + `Presenter.tsx`:
   - `create-room` callback → simpan token ke state + localStorage
   - `start-question`, `close-question`, `award-star` emit → tambah hostToken di payload

4. `shared/src/index.ts`:
   - `ClientToServerEvents` payload tambah `hostToken?: string`

**Files:** `shared/src/index.ts`, `server/src/roomManager.ts`, `server/src/index.ts`, `client/src/App.tsx`, `client/src/components/Presenter.tsx`

**Test:** `server/src/test-host-token.ts` (self-check)

---

#### Task 2: Timer Server-Side + Auto-Close (P-03, FR-8) — 3-4 jam
**Tujuan:** Timer berjalan di server. Saat habis, aktivitas ditutup otomatis.

**Desain:**
- Question payload ada `timeLimitSec` (optional, default 0 = unlimited)
- `startQuestion()` → set `question.timeStartedAt = Date.now()`
- Server interval check setiap 1 detik: jika sekarang > timeStartedAt + timeLimitSec, auto-close
- Emit `question-closed` ke semua klien dalam room
- Klien menerima & update UI

**Kode changes:**
1. `roomManager.ts`:
   - `startQuestion()` → set `question.timeStartedAt`
   - Tambah public method `getActiveQuestionTimeRemaining(code, questionId)` → return sisa detik
   - Tambah method `autoCloseExpiredQuestions(code)` → check & close

2. `index.ts` (server):
   - Setup `setInterval()` setiap 1 detik (global) → loop semua rooms, cek auto-close
   - Atau per-room timer lebih efisien
   - Saat auto-close, emit `question-closed` ke room

3. `Presenter.tsx`:
   - Display countdown dari sisa waktu (derived dari server state atau kalkulasi client)
   - Button "Tambah 15s" masih ada (opsional untuk R1, bisa dihapus atau tetap)

4. `Participant.tsx`:
   - Display countdown (user-facing, informatif saja)

5. `shared/src/index.ts`:
   - `Question` sudah ada `timeLimitSec` & `timeStartedAt` (tinggal pakai)

**Files:** `server/src/roomManager.ts`, `server/src/index.ts`, `client/src/components/Presenter.tsx`, `client/src/components/Participant.tsx`

**Test:** `server/src/test-timer.ts`

---

#### Task 3: Reconnect 5 Menit (F-05, FR-9) — 3-4 jam
**Tujuan:** Peserta yang terputus & reconnect dalam 5 menit mempertahankan skor & jawaban.

**Desain:**
- Saat `join-room` pertama kali, buat `participantSessionToken` (32 hex char) → kirim ke peserta
- Peserta simpan token ke localStorage
- Saat disconnect, jangan hapus participant dari room — tunda 5 menit dengan `disconnectedAt` timestamp
- Saat peserta reconnect, kirim token lama (dari localStorage)
- Server check: `(Date.now() - participant.disconnectedAt) < 5 * 60 * 1000`
  - Jika ya: re-bind socket baru ke participant lama, restore state
  - Jika tidak: reject, participant dihapus, user join sebagai peserta baru

**Kode changes:**
1. `roomManager.ts`:
   - `Participant` interface + field `sessionToken`, `disconnectedAt?`
   - `joinRoom()` → generate sessionToken; return ke klien
   - `reconnectParticipant(code, sessionToken, newSocketId)` → check grace period, re-bind socket
   - `handleDisconnect()` → jangan hapus, tandai `disconnectedAt`
   - Cleanup timer: setiap 5 menit, hapus participant yang sudah 5 menit offline

2. `index.ts` (server):
   - Event `rejoin-room`: `(payload: { code, sessionToken }, callback)`
   - Validasi & call `roomManager.reconnectParticipant()`
   - Emit `participant-rejoined` ke room

3. `App.tsx`:
   - `join-room` response → simpan sessionToken ke localStorage dengan key `session_${code}`

4. `Participant.tsx`:
   - Saat mount, check localStorage untuk sessionToken
   - Jika ada & room code cocok, emit `rejoin-room` dulu sebelum `join-room`
   - Handle reconnect UI (toast: "Terhubung kembali!")

5. `shared/src/index.ts`:
   - Tambah event `rejoin-room` di `ClientToServerEvents`
   - Tambah event `participant-rejoined` di `ServerToClientEvents`

**Files:** `server/src/roomManager.ts`, `server/src/index.ts`, `client/src/App.tsx`, `client/src/components/Participant.tsx`, `shared/src/index.ts`

**Test:** `server/src/test-reconnect.ts` — simulasi disconnect & reconnect

---

### P1 Tasks (Penting, tapi tidak blocker)

#### Task 4: Close Room Eksplisit (F-06) — 1 jam
- Event `close-room` di Presenter (button "Akhiri Sesi")
- Server: set `room.status = 'finished'`, emit `room-closed`
- Simpan laporan ke DB

**Files:** `server/src/index.ts`, `client/src/components/Presenter.tsx`

---

#### Task 5: Kick Peserta (F-10) — 1-2 jam
- Event `kick-participant` payload: `{ code, hostToken, participantId }`
- Server: validasi host token, remove participant, emit `participant-kicked` ke room
- Peserta yang dikick melihat alert & di-eject ke landing

**Files:** `server/src/roomManager.ts`, `server/src/index.ts`, `client/src/components/Participant.tsx`, `shared/src/index.ts`

---

#### Task 6: Rate Limit — 1-2 jam
- Rate limiter middleware untuk `/api/`, `/socket.io/`
- Limit `join-room`: 10 per menit per IP
- Limit `submit-answer`: 100 per menit per socket
- Limit `award-star`: 50 per menit per socket
- Reject dengan 429 atau error callback

**Library:** `npm install express-rate-limit` (atau implementasi custom sederhana in-memory)

**Files:** `server/src/index.ts`

---

### P0 Infrastructure Tasks

#### Task 7: Deploy Vercel + Railway — 2-3 jam
**Checklist:**
- [ ] Railway: set env var `VITE_SERVER_URL=https://inixpoint-server.railway.app`
- [ ] Vercel: build & deploy client (sudah ada vercel.json)
- [ ] Railway: `npm run build && npm start` (sudah ada di package.json)
- [ ] CORS: server allow `https://inixpoint.vercel.app`
- [ ] WebSocket: validasi di browser dev tools → Network → WS
- [ ] Health check: `GET /api/health` → 200
- [ ] Uji join room dari live URL

**Files:** `vercel.json`, `server/src/index.ts` (CORS), `.env` (Railway), README deploy steps

---

#### Task 8: Uji Beban 200 Peserta — 2 jam
**Tujuan:** Simulasi 200 peserta konkuren, capture latensi, error rate.

**Alat:** Socket.io client library di Node.js + script uji

**Skenario:**
1. Presenter buat room
2. 200 peserta join dalam 10 detik
3. Presenter start question (MC)
4. 200 peserta submit answer acak dalam 5 detik
5. Presenter close question
6. Catat: latensi submit (p50, p95, p99), CPU, memori, error count

**Script:** `server/src/load-test-200.ts`
- Gunakan `socket.io-client` lokal
- Spawn 200 koneksi
- Measure response time per event
- Export hasil CSV

**Files:** `server/src/load-test-200.ts`, `server/package.json` (devDep: socket.io-client)

---

## Urutan Implementasi (Sequential)

1. **Task 1: Token Host** (perlu framework sebelum task lain)
2. **Task 2: Timer Server** (independent, 3-4 jam)
3. **Task 3: Reconnect** (independent, 3-4 jam)
4. **Task 4: Close Room** (simple, 1 jam)
5. **Task 5: Kick Peserta** (bergantung Task 1 token validasi)
6. **Task 6: Rate Limit** (independent, 1-2 jam)
7. **Task 7: Deploy** (setelah semua siap)
8. **Task 8: Beban Test** (testing task, after Task 1-6 deployed)

**Total waktu perkiraan:** 18-24 jam development + testing.

---

## Acceptance Criteria (dari PRD R1)

- [x] Presenter membuat room dan peserta join via kode & QR ✅ (sudah ada)
- [ ] **Token host:** Klien non-host tidak dapat menjalankan kontrol presenter (diuji dengan klien palsu)
- [ ] **Timer:** Aktivitas ditutup otomatis saat timer habis; selisih tampilan antar klien < 1 dtk
- [ ] **Reconnect:** Peserta terputup dan tersambung kembali mempertahankan skor utuh
- [ ] CSV terunduh dan isinya cocok dengan sesi ✅ (sudah ada)
- [ ] Tanpa overflow horizontal di 393px ✅ (sudah diperbaiki di session sebelum)
- [ ] **Deploy live** Vercel + Railway berfungsi dengan WebSocket
- [ ] **Beban test:** 200 peserta simulasi, p95 latensi < 1 dtk, error rate < 0.1%

---

## Keputusan Desain

| Keputusan | Opsi | Dipilih | Alasan |
|---|---|---|---|
| Token format | UUID vs 16 hex | 16 hex | Pendek, deterministic, mudah debug |
| Grace period reconnect | 5 menit vs 10 menit | 5 menit | Default fair, bisa dikonfigurasi nanti |
| Timer interval server | Per-room vs global | Global + loop all rooms | Sederhana, 1 interval saja |
| Rate limit | Middleware vs custom | express-rate-limit | Teruji, standard |
| Load test peserta | 200 vs 500 | 200 | Sudah mencukupi R1, R7 mau 500 |
| Participant removal | Immediate vs grace period | Grace 5 min + explicit cleanup | User experience lebih baik |

---

## File Summary

### Modified
- `server/src/roomManager.ts`: +hostToken, +sessionToken, +reconnect logic, +auto-close
- `server/src/index.ts`: +event handlers, +timer interval, +rate limit, +CORS adjustment
- `client/src/App.tsx`: +token persist
- `client/src/components/Presenter.tsx`: +hostToken param, +close-room UI
- `client/src/components/Participant.tsx`: +sessionToken persist, +rejoin logic
- `shared/src/index.ts`: +event types

### Created
- `server/src/test-host-token.ts`: self-check token validasi
- `server/src/test-timer.ts`: self-check auto-close
- `server/src/test-reconnect.ts`: self-check reconnect
- `server/src/load-test-200.ts`: uji beban 200 peserta

### Updated
- `server/package.json`: +express-rate-limit, +socket.io-client (devDep)
- `README.md`: +R1 deployment steps & load test hasil
- `.env.example`: +VITE_SERVER_URL, +RATE_LIMIT_*

---

## Next Steps

1. **Validate Requirements** dengan pengguna (optional, jika ada perubahan PRD)
2. **Start Task 1** (Token Host) — foundational
3. **Code Review Check** — pastikan socket.id validation & error handling solid
4. **Test Locally** sebelum deploy
5. **Deploy to Railway** (backend dulu)
6. **Deploy to Vercel** (client)
7. **Smoke Test** live
8. **Load Test** 200 peserta
9. **Document** hasil ke README
10. **Tag** v1.0-R1 di Git

---

## Estimasi Timeline (Dengan 1 Developer)

| Phase | Task | Jam | Tanggal |
|---|---|---|---|
| **Dev** | Task 1-3 (P0 core) | 8-10 | Hari 1-2 |
| **Dev** | Task 4-6 (P1) | 3-4 | Hari 2 |
| **Dev** | Task 7 setup (deploy config) | 2 | Hari 2 |
| **Test** | Local test + bug fix | 3-4 | Hari 2-3 |
| **Infra** | Deploy + validasi live | 2-3 | Hari 3 |
| **Test** | Load test + capture | 2 | Hari 3-4 |
| **Doc** | Update README & tag | 1 | Hari 4 |
| **Total** | — | **21-25** | ~4 hari kerja |

---

## Risks & Mitigation

| Risk | Dampak | Mitigasi |
|---|---|---|
| Deploy Railway gagal WebSocket | R1 tertunda | Test WebSocket lokal dulu sebelum deploy |
| Beban test menunjukkan bottleneck | Perlu refactor | Mulai dengan 50, increment ke 200, monitor CPU |
| Token generation collision | Peserta bisa reconnect ke room lain | Use UUID, bukan random sederhana |
| Reconnect logic break existing peserta | User kehilangan skor | Backward compat: jika no sessionToken, treat as new join |
| Timer tidak sinkron antar klien | Peserta submit setelah tutup server | Grace period 2 detik sebelum close (submit deadline) |

Siap dimulai? 🚀
