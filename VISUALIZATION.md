# 🎯 InixPoint - Project Visualization & Architecture

Visualisasi lengkap untuk memahami project structure, data flow, dan komponen-komponen.

---

## 1️⃣ Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          InixPoint System                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │   Presenter      │         │   Participant    │                │
│  │  (Browser Tab)   │         │  (Browser Tab)   │                │
│  │                  │         │                  │                │
│  │ • Create Room    │         │ • Join Room      │                │
│  │ • Launch Quiz    │◄────────┤ • Answer Quiz    │                │
│  │ • View Results   │  WS     │ • Draw Canvas    │                │
│  │ • Export Data    │         │ • See Leaderboard│                │
│  └────────┬─────────┘         └────────┬─────────┘                │
│           │                            │                          │
│           └──────────────┬─────────────┘                          │
│                          │                                        │
│                    Socket.io                                      │
│                  (WebSocket)                                      │
│                          │                                        │
│           ┌──────────────▼───────────────┐                       │
│           │   Express.js Server          │                       │
│           │   (http://localhost:4000)    │                       │
│           │                              │                       │
│           │  • Socket Event Handlers     │                       │
│           │  • Room State Management     │                       │
│           │  • Data Persistence         │                       │
│           └──────────┬─────────┬─────────┘                       │
│                      │         │                                 │
│           ┌──────────▼─┐   ┌──▼───────────┐                    │
│           │   Memory   │   │   SQLite     │                    │
│           │  (Rooms)   │   │ (.database/) │                    │
│           │            │   │              │                    │
│           │ • Sessions │   │ • Reports    │                    │
│           │ • Answers  │   │ • Analytics  │                    │
│           │ • State    │   │ • Export CSV │                    │
│           └────────────┘   └──────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Data Flow: Full Quiz Session

```
STEP 1: Create Room
┌─────────────┐
│  Presenter  │
│   Clicks    │ "Buka Ruangan Baru"
└──────┬──────┘
       │
       ▼
   [Socket.io]
       │
       ▼
   ┌────────────────────┐
   │ Server: create-room│
   │ - Generate Code    │
   │ - Create Room      │
   │ - Store in Memory  │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ Presenter Gets:    │
   │ - Room Code (PIN)  │
   │ - QR Code          │
   │ - URL              │
   └────────────────────┘

STEP 2: Participant Joins
┌──────────────┐
│ Participant  │
│ Scan QR/PIN  │
└───────┬──────┘
        │
        ▼
    [Socket.io]
        │
        ▼
   ┌─────────────────────┐
   │ Server: join-room   │
   │ - Validate Code     │
   │ - Add to Participants│
   │ - Store in Memory   │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Broadcast to Room:  │
   │ participant-joined  │
   └─────────────────────┘

STEP 3: Launch Question
┌─────────────┐
│  Presenter  │
│ Starts Quiz │
└──────┬──────┘
       │
       ▼
   [Socket.io]
       │
       ▼
   ┌──────────────────────┐
   │ Server: start-question│
   │ - Store Question     │
   │ - Initialize Tally   │
   │ - In Memory          │
   └────────────┬─────────┘
                │
                ▼
   ┌──────────────────────┐
   │ Broadcast Question:  │
   │ • Type (MCQ/Cloud)   │
   │ • Options            │
   │ • Timer (if any)     │
   └──────────────────────┘

STEP 4: Participants Answer
┌─────────────┐
│ Participant │
│ Select Ans. │ (Multiple Choice / Draw / Text)
└──────┬──────┘
       │
       ▼
   [Socket.io]
       │
       ▼
   ┌────────────────────┐
   │ Server: submit-ans │
   │ - Store Answer     │
   │ - Update Tally     │
   │ - In Memory        │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ Broadcast Tally:   │
   │ • Updated Counts   │
   │ • Chart Data       │
   │ • Real-time View   │
   └────────────────────┘

STEP 5: Close Question & Persist
┌─────────────┐
│  Presenter  │
│ Close Quiz  │
└──────┬──────┘
       │
       ▼
   [Socket.io]
       │
       ▼
   ┌────────────────────┐
   │ Server: close-q    │
   │ - Finalize Ans.    │
   │ - Save to SQLite   │
   │ - Generate Report  │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ SQLite Insert:     │
   │ • room_sessions    │
   │ • questions        │
   │ • answers          │
   │ • participants     │
   └────────────────────┘
```

---

## 3️⃣ Component Hierarchy

### Frontend Components

```
App (Landing Page)
├─ Login Card
│  ├─ Input: Name
│  └─ Input: PIN
└─ Create Card
   └─ Button: Buka Ruangan Baru

Presenter Component
├─ Header
│  ├─ Room Code Display
│  ├─ QR Code Generator
│  └─ Participant Count
│
├─ Question Control Panel
│  ├─ Question Type Selector
│  ├─ Question Builder
│  └─ Start/Stop Button
│
├─ Answer Visualization
│  ├─ MatchingQuestion (MCQ + Tally)
│  ├─ WordCloud
│  ├─ ShortAnswerFeed
│  └─ LeaderBoard
│
└─ Footer
   ├─ Export CSV Button
   └─ End Session Button

Participant Component
├─ Header
│  └─ Name + Room Code
├─ Question Display
│  ├─ MCQ Options
│  ├─ Text Input
│  ├─ Drawing Canvas
│  └─ Word Cloud Input
└─ Status Bar
   └─ "Waiting..." / "Submitted" indicator

DrawingCanvas
├─ HTML5 Canvas
├─ Tools (Pen, Eraser, Clear)
└─ Submit Button

LeaderBoard
├─ Score Table
├─ Sort Options
└─ Rank Display
```

---

## 4️⃣ Backend Socket.io Events

```
CLIENT → SERVER EVENTS
├─ join-room
│  ├─ Payload: { code, name }
│  └─ Response: participant list
│
├─ create-room
│  ├─ No Payload
│  └─ Response: room code + QR
│
├─ start-question
│  ├─ Payload: { type, question, options, timer? }
│  └─ Stores in Memory
│
├─ submit-answer
│  ├─ Payload: { participantId, questionId, answer }
│  └─ Updates Tally
│
├─ close-question
│  ├─ No Payload
│  └─ Saves to SQLite
│
└─ end-session
   ├─ No Payload
   └─ Cleanup Memory + Export

SERVER → CLIENT EVENTS
├─ room-created
│  └─ Payload: { code, qrUrl, url }
│
├─ participant-joined
│  └─ Payload: { participants[], roomCode }
│
├─ question-started
│  └─ Payload: { type, question, options }
│
├─ answer-tally-updated
│  └─ Payload: { counts, percentage, visualization }
│
├─ question-closed
│  └─ Payload: { results, topAnswer }
│
├─ room-ended
│  └─ Payload: { reportUrl, csvUrl }
│
└─ participant-left
   └─ Payload: { participantId, remaining[] }
```

---

## 5️⃣ Database Schema (SQLite)

```
┌─────────────────────────┐
│    room_sessions        │
├─────────────────────────┤
│ id (PK)                 │
│ room_code               │
│ created_at              │
│ ended_at                │
│ total_participants      │
│ total_questions         │
│ session_data (JSON)     │
└─────────────────────────┘
         ▲
         │ (1:N)
         │
┌─────────────────────────┐
│      questions          │
├─────────────────────────┤
│ id (PK)                 │
│ session_id (FK)         │
│ type (mcq/cloud/text)   │
│ question_text           │
│ options (JSON)          │
│ correct_answer          │
│ created_at              │
└─────────────────────────┘
         ▲
         │ (1:N)
         │
┌─────────────────────────┐
│       answers           │
├─────────────────────────┤
│ id (PK)                 │
│ question_id (FK)        │
│ participant_id          │
│ answer_value            │
│ is_correct              │
│ submitted_at            │
└─────────────────────────┘
         ▲
         │ (1:N)
         │
┌─────────────────────────┐
│     participants        │
├─────────────────────────┤
│ id (PK)                 │
│ session_id (FK)         │
│ name                    │
│ joined_at               │
│ score                   │
│ answer_count            │
└─────────────────────────┘
```

---

## 6️⃣ Feature Matrix & Status

| Feature | Component | Status | Priority | Notes |
|---------|-----------|--------|----------|-------|
| **Room Creation** | Presenter | ✅ Done | P0 | PIN + QR working |
| **Join Room** | Participant | ✅ Done | P0 | PIN validation OK |
| **Multiple Choice** | MatchingQuestion | ✅ Done | P0 | Real-time tally |
| **Word Cloud** | WordCloud | ✅ Done | P0 | Frequency sorting |
| **Short Answer** | ShortAnswerFeed | ✅ Done | P0 | Grid display |
| **Drawing Canvas** | DrawingCanvas | ✅ Done | P1 | HTML5 canvas |
| **Leaderboard** | LeaderBoard | ⚠️ Basic | P2 | Needs persistence |
| **Timer** | Question Control | ⏳ Planned | P2 | Countdown needed |
| **PDF Viewer** | Presenter | ⏳ Planned | P2 | Slide deck support |
| **Export CSV** | Footer | ✅ Done | P1 | Full report |
| **Socket.io** | Bridge | ✅ Done | P0 | Real-time WS |
| **SQLite** | Persistence | ✅ Done | P0 | Local DB |
| **Mobile Responsive** | UI | ⚠️ Partial | P1 | Needs tweaking |
| **Authentication** | Auth | ⏳ Planned | P3 | Future phase |
| **Multi-presenter** | Presenter | ⏳ Planned | P3 | Future phase |

---

## 7️⃣ Development Focus Areas

### 🎨 Frontend Dev Tasks
```
client/src/
├─ App.tsx                  → Landing page improvements
├─ components/
│  ├─ Presenter.tsx         → Control panel UI
│  ├─ Participant.tsx       → Participant view
│  ├─ MatchingQuestion.tsx  → MCQ + Chart
│  ├─ WordCloud.tsx         → Cloud visualization
│  ├─ DrawingCanvas.tsx     → Canvas interaction
│  └─ Leaderboard.tsx       → Score board
├─ lib/socket.ts            → Socket listeners
└─ index.css                → Tailwind styling
```

### 🔧 Backend Dev Tasks
```
server/src/
├─ index.ts                 → Main entry + Socket handlers
├─ roomManager.ts           → State logic
│  ├─ createRoom()
│  ├─ joinRoom()
│  ├─ startQuestion()
│  ├─ submitAnswer()
│  ├─ closeQuestion()
│  └─ endSession()
└─ db.ts                    → SQLite queries
   ├─ initDB()
   ├─ saveRoomSession()
   ├─ saveQuestion()
   ├─ saveAnswers()
   └─ exportReport()
```

### 📦 Shared Dev Tasks
```
shared/src/
├─ Room interface
├─ Question interface
├─ Answer interface
├─ Participant interface
├─ QuestionType enum
└─ Socket event contracts
```

---

## 8️⃣ Testing Matrix

| Scenario | Steps | Expected | Status |
|----------|-------|----------|--------|
| **Create Room** | Presenter clicks "Buka" | PIN generated + QR shown | ✅ |
| **Join Valid** | Participant enters valid PIN | Connected to room | ✅ |
| **Join Invalid** | Participant enters wrong PIN | Error message | ✅ |
| **MCQ Real-time** | Participant selects option | Tally updates instantly | ✅ |
| **Word Cloud** | Multiple submissions | Frequency sorted | ✅ |
| **Drawing Submit** | Submit canvas | Image in gallery | ✅ |
| **Persistence** | End session | Data in SQLite | ✅ |
| **Multi-device** | Presenter + 2 Participants | All synced | ✅ |
| **Disconnect** | Participant closes tab | Removed from list | ✅ |
| **Mobile Responsive** | Open on mobile | UI adapted | ⚠️ Needs work |

---

## 9️⃣ Performance Targets

```
Metrics (Development)
├─ WebSocket latency      → < 100ms (Real-time feel)
├─ UI render time         → < 16ms (60 FPS)
├─ Bundle size (client)   → < 500KB (Prod build)
├─ Server memory (idle)   → < 100MB (3-5 rooms)
├─ SQLite query time      → < 50ms (Report generation)
└─ Battery drain (mobile) → Acceptable (HMR off in prod)

Load Test (Expected)
├─ Participants per room  → 50+ (Tested)
├─ Concurrent rooms       → 10+ (Not tested)
├─ Message throughput     → 100+ msg/sec (Not tested)
└─ Storage growth         → ~1MB per 100 sessions
```

---

## 🔟 Deployment Checklist

```
Pre-Production
├─ [ ] All tests passing
├─ [ ] Code review approved
├─ [ ] No console errors
├─ [ ] Performance tested
├─ [ ] Security review done
└─ [ ] Docs updated

Production (Vercel)
├─ [ ] Build: npm run build
├─ [ ] Deploy client to Vercel
├─ [ ] Deploy server to Vercel / Railway
├─ [ ] .env variables set
├─ [ ] Database migration (if needed)
├─ [ ] Smoke test in production
└─ [ ] Monitor for errors

Post-Deploy
├─ [ ] Alert team on Slack
├─ [ ] Update version number
├─ [ ] Close related issues
└─ [ ] Plan Phase 2 tasks
```

---

## 📚 Resource Links

- **GitHub Repo:** https://github.com/aqilwahid/InixPoint
- **React Docs:** https://react.dev
- **Socket.io Docs:** https://socket.io/docs/v4/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vite Guide:** https://vitejs.dev/guide/
- **Node.js SQLite:** https://nodejs.org/api/sqlite.html

---

**Last Updated:** 2026-11-05  
**Maintained by:** Team InixPoint
