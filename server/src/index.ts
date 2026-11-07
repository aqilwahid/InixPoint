import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents, BUILTIN_PLUGINS, i18n } from '@inixpoint/shared';
import {
  initDatabase,
  getRoomSummary,
  getSessionReport,
  getSessionsByOwner,
  getQuestionAnalytics,
  getLevelByStars,
  getAllLevels,
  createGroup,
  getGroupLeaderboard,
  getBranding,
  updateBranding,
  saveCustomPlugin,
  getCustomPlugins,
  revokeCustomPlugin,
  deleteCustomPlugin,
  reportPluginIssue
} from './db.js';
import { RoomManager } from './roomManager.js';
import { registerUser, loginUser, verifyToken, extractToken } from './auth.js';
import { createClass, getClassesByOwner, getClassById, updateClass, deleteClass, getClassLeaderboard, setClassLocked, addRosterEntry, getRoster, clearRoster } from './classes.js';
import ExcelJS from 'exceljs';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

initDatabase();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }
});

const roomManager = new RoomManager();

// R5 FR-17: Track plugin message rates per socket (max 10 messages/sec)
const pluginMessageTimestamps = new Map<string, number[]>();

// ponytail: auto-close expired questions; upgrade to per-question timer if precision needed
setInterval(() => {
  const expired = roomManager.closeExpired();
  for (const item of expired) {
    console.log(`[Timer] Auto-closed question ${item.questionId} in room ${item.code}`);
    io.to(item.code).emit('question-closed', { questionId: item.questionId, answers: item.answers });
  }
}, 500);

// ponytail: cleanup disconnected participants beyond 5-min grace period
setInterval(() => {
  const cleaned = roomManager.cleanupStaleParticipants();
  if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} stale participants`);
}, 60000); // every minute

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'InixPoint Server' });
});

// R4 Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ success: false, error: 'Email, password, dan name wajib diisi' });
  const result = await registerUser(email, password, name);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email dan password wajib diisi' });
  const result = await loginUser(email, password);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// Middleware: verify token dari Authorization header (opsional untuk endpoint tertentu)
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractToken(req.headers.authorization);
  if (!token) return res.status(401).json({ success: false, error: 'Token tidak ditemukan' });
  const verification = verifyToken(token);
  if (!verification.valid) return res.status(401).json({ success: false, error: 'Token tidak valid' });
  (req as any).user = verification.payload;
  next();
}

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: (req as any).user });
});

// R4-F07: Classes API (Kelas Tersimpan)
app.post('/api/classes', authMiddleware, (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name : '';
  const description = typeof req.body.description === 'string' ? req.body.description : undefined;
  if (!name) return res.status(400).json({ success: false, error: 'Nama kelas wajib diisi' });
  const classObj = createClass((req as any).user.userId, name, description);
  res.json({ success: true, class: classObj });
});

app.get('/api/classes', authMiddleware, (req, res) => {
  const classes = getClassesByOwner((req as any).user.userId);
  res.json({ success: true, classes });
});

app.get('/api/classes/:id', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const classObj = getClassById(id, (req as any).user.userId);
  if (!classObj) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true, class: classObj });
});

app.put('/api/classes/:id', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const name = typeof req.body.name === 'string' ? req.body.name : undefined;
  const description = typeof req.body.description === 'string' ? req.body.description : undefined;
  const updated = updateClass(id, (req as any).user.userId, { name, description });
  if (!updated) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true, class: updated });
});

app.delete('/api/classes/:id', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const deleted = deleteClass(id, (req as any).user.userId);
  if (!deleted) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true });
});

app.get('/api/classes/:id/leaderboard', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const leaderboard = getClassLeaderboard(id, (req as any).user.userId);
  res.json({ success: true, leaderboard });
});

// F-08/09: Lock class
app.post('/api/classes/:id/lock', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const success = setClassLocked(id, (req as any).user.userId, true);
  if (!success) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true, locked: true });
});

app.post('/api/classes/:id/unlock', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const success = setClassLocked(id, (req as any).user.userId, false);
  if (!success) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true, locked: false });
});

// F-11: Roster import (CSV)
app.post('/api/classes/:id/roster', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const cls = getClassById(id, (req as any).user.userId);
  if (!cls) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });

  const csv = typeof req.body.csv === 'string' ? req.body.csv : '';
  const lines = csv.split('\n').filter((l: string) => l.trim());
  clearRoster(id);

  let added = 0;
  for (const line of lines) {
    const parts = line.split(',').map((p: string) => p.trim());
    if (parts[0]) {
      addRosterEntry(id, parts[0], parts[1]);
      added++;
    }
  }

  res.json({ success: true, added });
});

app.get('/api/classes/:id/roster', authMiddleware, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const cls = getClassById(id, (req as any).user.userId);
  if (!cls) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });

  const roster = getRoster(id);
  res.json({ success: true, roster });
});

// R4-R04: Session history & reporting
app.get('/api/sessions', authMiddleware, (req, res) => {
  const sessions = getSessionsByOwner((req as any).user.userId);
  res.json({ success: true, sessions });
});

app.get('/api/sessions/:code/report', authMiddleware, (req, res) => {
  const code = typeof req.params.code === 'string' ? req.params.code : '';
  const report = getSessionReport(code);
  if (!report) return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
  res.json({ success: true, report });
});

// R4-R05: Question analytics
app.get('/api/sessions/:code/questions/:questionId/analytics', authMiddleware, (req, res) => {
  const code = typeof req.params.code === 'string' ? req.params.code : '';
  const questionId = typeof req.params.questionId === 'string' ? req.params.questionId : '';
  const analytics = getQuestionAnalytics(code, questionId);
  if (!analytics) return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
  res.json({ success: true, analytics });
});

// G-08/09: Grouping & group leaderboard
app.post('/api/classes/:id/groups', authMiddleware, (req, res) => {
  const classId = typeof req.params.id === 'string' ? req.params.id : '';
  const { groupName, members } = req.body;
  if (!groupName) return res.status(400).json({ success: false, error: 'Nama grup wajib diisi' });
  const members_arr = Array.isArray(members) ? members : [];
  const success = createGroup(classId, (req as any).user.userId, groupName, members_arr);
  if (!success) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
  res.json({ success: true, groupName });
});

app.get('/api/classes/:id/groups/leaderboard', authMiddleware, (req, res) => {
  const classId = typeof req.params.id === 'string' ? req.params.id : '';
  const lb = getGroupLeaderboard(classId, (req as any).user.userId);
  res.json({ success: true, leaderboard: lb });
});

// R-05: Export analytics type
app.get('/api/analytics/levels', (req, res) => {
  res.json({ success: true, data: getAllLevels() });
});

// D-08: Export session as PDF (using existing report + excel format)
app.get('/api/sessions/:code/export', authMiddleware, (req, res) => {
  const code = typeof req.params.code === 'string' ? req.params.code : '';
  const report = getSessionReport(code);
  if (!report) return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
  res.json({ success: true, report, exportUrl: `/reports/${code}` });
});

// U-03: Branding settings
app.get('/api/branding', (req, res) => {
  const branding = getBranding();
  res.json({ success: true, branding });
});

app.put('/api/branding', authMiddleware, (req, res) => {
  const { logoUrl, primaryColor, secondaryColor } = req.body;
  updateBranding((req as any).user.userId, logoUrl, primaryColor, secondaryColor);
  res.json({ success: true });
});

// U-04: i18n endpoint
app.get('/api/i18n/:lang', (req, res) => {
  const lang = req.params.lang === 'en' ? 'en' : 'id';
res.json({ success: true, labels: i18n[lang] });
});

// R-06: Database config (PostgreSQL abstraction)
app.get('/api/config/database', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'SQLite in use (PostgreSQL migration ready in schema)' });
});

// R5 PL-01, PL-08, PL-09, PL-10, PL-16: Plugin Management Endpoints
app.get('/api/plugins', (req, res) => {
  const custom = getCustomPlugins();
  const plugins = [
    ...BUILTIN_PLUGINS.map(p => ({ ...p, isBuiltin: true })),
    ...custom.map(c => {
      let manifest: any = {};
      try { manifest = JSON.parse(c.manifest_json); } catch {}
      return {
        manifest,
        html: c.html_content,
        isBuiltin: false,
        ownerId: c.owner_id,
        createdAt: c.created_at
      };
    })
  ];
  res.json({ success: true, plugins });
});

app.post('/api/plugins', (req, res) => {
  const token = extractToken(req.headers.authorization);
  const verification = token ? verifyToken(token) : null;
  const user = verification?.valid ? verification.payload : null;
  const { manifest, html } = req.body;

  if (!manifest || typeof manifest !== 'object') {
    return res.status(400).json({ success: false, error: 'Manifest plugin tidak valid' });
  }
  if (!manifest.id || !manifest.name || !manifest.version) {
    return res.status(400).json({ success: false, error: 'Manifest harus memiliki id, name, dan version' });
  }
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ success: false, error: 'Konten HTML plugin wajib ada' });
  }
  if (Buffer.byteLength(html, 'utf8') > 5 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: 'Ukuran paket plugin melebihi batas 5 MB' });
  }

  saveCustomPlugin({
    id: manifest.id,
    ownerId: user?.userId,
    name: manifest.name,
    version: manifest.version,
    manifestJson: JSON.stringify(manifest),
    htmlContent: html,
  });

  res.json({ success: true, pluginId: manifest.id });
});

app.post('/api/plugins/:id/revoke', (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  revokeCustomPlugin(id);
  res.json({ success: true, message: 'Plugin berhasil dicabut (kill switch diaktifkan)' });
});

app.delete('/api/plugins/:id', (req, res) => {
  const token = extractToken(req.headers.authorization);
  const verification = token ? verifyToken(token) : null;
  const user = verification?.valid ? verification.payload : null;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  deleteCustomPlugin(id, user?.userId);
  res.json({ success: true });
});

app.post('/api/plugins/:id/report', (req, res) => {
  const token = extractToken(req.headers.authorization);
  const verification = token ? verifyToken(token) : null;
  const user = verification?.valid ? verification.payload : null;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason : 'Masalah performa / bug';
  const reportId = reportPluginIssue(id, user?.userId, reason);
  res.json({ success: true, reportId });
});

app.get('/api/reports/:code', (req, res) => {
  const summary = getRoomSummary(req.params.code);
  if (!summary.session) {
    return res.status(404).json({ error: 'Data sesi tidak ditemukan' });
  }
  res.json(summary);
});

// CSV Export endpoint (stdlib, no heavy dependencies needed)
app.get('/api/reports/:code/csv', (req, res) => {
  const summary = getRoomSummary(req.params.code);
  if (!summary.session) {
    return res.status(404).send('Not Found');
  }

  const rows = [
    ['Room Code', summary.session.code],
    ['Title', summary.session.title],
    ['Status', summary.session.status],
    ['Participants', summary.session.total_participants],
    ['Questions', summary.session.total_questions],
    [],
    ['Answer ID', 'Question ID', 'Participant Name', 'Answer Content', 'Is Correct', 'Submitted At']
  ];

  for (const a of summary.answers as any[]) {
    rows.push([
      a.id,
      a.question_id,
      `"${(a.participant_name || '').replace(/"/g, '""')}"`,
      `"${(a.content || '').replace(/"/g, '""')}"`,
      a.is_correct ? 'Yes' : 'No',
      new Date(a.submitted_at).toISOString()
    ]);
  }

  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="inixpoint-report-${req.params.code}.csv"`);
  res.send(csv);
});
app.get('/api/reports/:code/xlsx', async (req, res) => {
const summary = getRoomSummary(req.params.code);
if (!summary.session) return res.status(404).send('Not Found');
const workbook = new ExcelJS.Workbook();
const overview = workbook.addWorksheet('Ringkasan');
overview.addRows([['Kode Room', summary.session.code], ['Judul', summary.session.title], ['Peserta', summary.session.total_participants], ['Pertanyaan', summary.session.total_questions]]);
const answers = workbook.addWorksheet('Jawaban');
answers.addRow(['ID', 'Question ID', 'Participant', 'Content', 'Correct', 'Points', 'Duration (sec)', 'Stars', 'Submitted At']);
for (const answer of summary.answers as any[]) answers.addRow([answer.id, answer.question_id, answer.participant_name, answer.content, !!answer.is_correct, answer.points_awarded || 0, answer.response_duration_sec || 0, answer.stars_earned || 0, new Date(answer.submitted_at)]);
const participants = workbook.addWorksheet('Peserta');
participants.addRow(['Participant ID', 'Name', 'Answers', 'Correct', 'Score', 'Stars']);
const participantRows = new Map<string, any>();
for (const answer of summary.answers as any[]) { const row = participantRows.get(answer.participant_id) || [answer.participant_id, answer.participant_name, 0, 0, 0, 0]; row[2]++; row[3] += answer.is_correct ? 1 : 0; row[4] += answer.points_awarded || 0; row[5] += answer.stars_earned || 0; participantRows.set(answer.participant_id, row); }
for (const row of participantRows.values()) participants.addRow(row);
const questions = workbook.addWorksheet('Pertanyaan');
questions.addRow(['Question ID', 'Answers', 'Correct', 'Points', 'Average Duration (sec)']);
const questionRows = new Map<string, any>();
for (const answer of summary.answers as any[]) { const row = questionRows.get(answer.question_id) || [answer.question_id, 0, 0, 0, 0]; row[1]++; row[2] += answer.is_correct ? 1 : 0; row[3] += answer.points_awarded || 0; row[4] += answer.response_duration_sec || 0; questionRows.set(answer.question_id, row); }
for (const row of questionRows.values()) { row[4] = row[1] ? Number((row[4] / row[1]).toFixed(1)) : 0; questions.addRow(row); }
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', `attachment; filename="inixpoint-report-${req.params.code}.xlsx"`);
await workbook.xlsx.write(res);
res.end();
});

const denyHost = (socketId: string, event: string) =>
  console.warn(`[Security] Host token invalid: ${event} from ${socketId}`);

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('create-room', (payload, callback) => {
    try {
      const classId = typeof payload.classId === 'string' ? payload.classId : undefined;
      const auth = verifyToken(typeof payload.authToken === 'string' ? payload.authToken : '');
      const ownerId = auth.valid && auth.payload ? auth.payload.userId : undefined;

      if (classId && ownerId) {
        // only the class owner may attach sessions to it (prevents leaderboard poisoning)
        if (!getClassById(classId, ownerId)) {
          return callback({ success: false, error: 'Kelas tidak ditemukan atau tidak diizinkan' });
        }
      }
      const room = roomManager.createRoom(payload.title, socket.id, classId, ownerId);
      socket.join(room.code);
      console.log(`[Room] Created room ${room.code} by host ${socket.id}` + (classId ? ` (class: ${classId})` : ''));
      callback({ success: true, room, hostToken: roomManager.getHostToken(room.code) });
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  socket.on('join-room', (payload, callback) => {
    const result = roomManager.joinRoom(payload.code, socket.id, payload.name);
    if (result.error || !result.room || !result.participant) {
      return callback({ success: false, error: result.error || 'Gagal bergabung ke ruangan' });
    }

    socket.join(result.room.code);
    socket.emit('qna-state', result.room.qna);
    console.log(`[Room] ${result.participant.name} (${socket.id}) joined ${result.room.code}`);

    // Notify room host and everyone in the room
    socket.to(result.room.code).emit('participant-joined', result.participant);
    callback({ success: true, room: result.room, sessionToken: result.sessionToken });
  });

  socket.on('rejoin-room', (payload, callback) => {
    const result = roomManager.reconnectParticipant(payload.code, payload.sessionToken, socket.id);
    if (result.error || !result.room || !result.participant) {
      return callback({ success: false, error: result.error || 'Reconnect gagal' });
    }

    socket.join(result.room.code);
    socket.emit('qna-state', result.room.qna);
    console.log(`[Room] ${result.participant.name} (${socket.id}) reconnected to ${result.room.code}`);

    // Notify room about reconnect
    socket.to(result.room.code).emit('participant-updated', result.participant);
    callback({ success: true, room: result.room });
  });

  socket.on('close-room', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'close-room');
    const room = roomManager.closeRoom(payload.code);
    if (room) {
      console.log(`[Room] Host closed room ${payload.code}`);
      io.to(payload.code).emit('room-closed');
    }
  });

  socket.on('kick-participant', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'kick-participant');
    const result = roomManager.kickParticipant(payload.code, payload.participantId);
    if (result.room && result.kicked) {
      console.log(`[Room] Host kicked ${result.kicked.name} from ${payload.code}`);
      io.to(payload.participantId).emit('participant-kicked', payload.participantId);
      io.to(payload.code).emit('participant-left', payload.participantId);
    }
  });

  socket.on('start-question', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'start-question');
    const question = roomManager.startQuestion(payload.code, payload.question);
    if (question) {
      console.log(`[Question] Started ${question.type} in room ${payload.code}`);
      io.to(payload.code).emit('question-started', question);
    }
  });

  socket.on('submit-answer', (payload, callback) => {
    const answer = roomManager.submitAnswer(payload.code, payload.questionId, socket.id, payload.content);
    if (!answer) {
      return callback({ success: false, error: 'Kuis tidak aktif atau Anda tidak terdaftar' });
    }

    console.log(`[Answer] Received from ${socket.id} in room ${payload.code}`);
    // Broadcast answer to room (especially host)
    io.to(payload.code).emit('answer-received', answer);
    callback({ success: true });
  });

  socket.on('broadcast-slide', (payload, callback) => {
  if (!roomManager.verifyHost(payload.code, payload.hostToken)) return callback?.({ success: false, error: 'Token host tidak valid' });
  const slide = payload.slide;
  if (!slide || !Number.isInteger(slide.index) || slide.index < 0 || slide.index > 1000 || typeof slide.title !== 'string' || slide.title.length > 300) return callback?.({ success: false, error: 'Data slide tidak valid' });
  io.to(payload.code).emit('slide-changed', slide);
  callback?.({ success: true });
  });
  socket.on('submit-qna', (payload, callback) => {
  const content = payload.content.trim();
  if (!content || content.length > 500) return callback({ success: false, error: 'Pertanyaan harus 1â€“500 karakter' });
  if (roomManager.getRoom(payload.code)?.qnaEnabled === false) return callback({ success: false, error: 'Live Q&A sedang dinonaktifkan presenter' });
  const item = roomManager.submitQna(payload.code, socket.id, content);
  if (!item) return callback({ success: false, error: 'Peserta atau ruangan tidak ditemukan' });
  io.to(payload.code).emit('qna-updated', item);
  callback({ success: true });
  });
  socket.on('upvote-qna', (payload, callback) => {
  const item = roomManager.upvoteQna(payload.code, payload.qnaId);
  if (!item) return callback?.({ success: false, error: 'Pertanyaan tidak ditemukan' });
  io.to(payload.code).emit('qna-updated', item);
  callback?.({ success: true });
  });
  socket.on('mark-qna', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'mark-qna');
    const item = roomManager.markQna(payload.code, payload.qnaId, payload.status);
  if (item) io.to(payload.code).emit('qna-updated', item);
  });
  socket.on('set-qna-enabled', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'set-qna-enabled');
    const room = roomManager.setQnaEnabled(payload.code, payload.enabled);
    if (room) io.to(payload.code).emit('room-state', room);
  });
  socket.on('close-question', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'close-question');
    const closed = roomManager.closeQuestion(payload.code, payload.questionId);
    if (closed) {
      console.log(`[Question] Closed question ${payload.questionId} in room ${payload.code}`);
      io.to(payload.code).emit('question-closed', closed);
    }
  });

  socket.on('award-star', (payload, callback) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) {
      denyHost(socket.id, 'award-star');
      return callback?.({ success: false, error: 'Akses presenter ditolak' });
    }
    const count = payload.count ?? 1;
    const updated = roomManager.awardStar(payload.code, payload.participantId, count);
    if (!updated) {
      return callback?.({ success: false, error: 'Peserta atau ruangan tidak ditemukan' });
    }
    console.log(`[Star] Host awarded ${count} star(s) to ${updated.name} in room ${payload.code}`);
    io.to(payload.code).emit('participant-updated', updated);
    io.to(payload.code).emit('star-awarded', {
      participantId: payload.participantId,
      count,
      totalStars: updated.stars || 0
    });
    callback?.({ success: true, stars: updated.stars });
  });

  // R5 PL-06 & FR-17: Relay plugin message between presenter and participants
  socket.on('plugin-message', (payload) => {
    const binding = roomManager.getSocketBinding(socket.id);
    if (!binding || binding.code !== payload.code) return;
    const room = roomManager.getRoom(payload.code);
    if (!room || room.currentQuestion?.type !== 'plugin_game') return;

    // Rate limiting: 10 msg/sec per socket
    const now = Date.now();
    const timestamps = (pluginMessageTimestamps.get(socket.id) || []).filter(t => now - t < 1000);
    if (timestamps.length >= 10) {
      console.warn(`[Plugin] Rate limit exceeded (>10 msg/s) from socket ${socket.id}`);
      return;
    }
    timestamps.push(now);
    pluginMessageTimestamps.set(socket.id, timestamps);

    // Size limit: 4 KB (FR-17)
    let serialized = '';
    try {
      serialized = JSON.stringify(payload.data);
    } catch {
      return;
    }
    if (Buffer.byteLength(serialized, 'utf8') > 4096) {
      console.warn(`[Plugin] Message size exceeded (>4KB) from socket ${socket.id}`);
      return;
    }

    if (binding.isHost) {
      // Host message -> broadcast to room or targeted participant
      if (payload.target === 'all' || !payload.target) {
        io.to(payload.code).emit('plugin-message', {
          fromRole: 'presenter',
          senderId: socket.id,
          data: payload.data
        });
      } else {
        io.to(payload.target).emit('plugin-message', {
          fromRole: 'presenter',
          senderId: socket.id,
          data: payload.data
        });
      }
    } else {
      // Participant message -> forward to host
      const participant = room.participants[socket.id];
      io.to(room.hostSocketId).emit('plugin-message', {
        fromRole: 'participant',
        senderId: socket.id,
        senderName: participant?.name || 'Peserta',
        data: payload.data
      });
    }
  });

  // R5 PL-07 & FR-5: Plugin score submission
  socket.on('plugin-score', (payload, callback) => {
    const result = roomManager.submitPluginScore(payload.code, socket.id, payload.points, payload.meta);
    if (!result.success) {
      return callback?.({ success: false, error: result.error });
    }
    if (result.participant) {
      io.to(payload.code).emit('participant-updated', result.participant);
    }
    callback?.({ success: true, pointsAwarded: result.pointsAwarded });
  });

  // R5 Plugin end by host
  socket.on('plugin-end', (payload) => {
    if (!roomManager.verifyHost(payload.code, payload.hostToken)) return denyHost(socket.id, 'plugin-end');
    const room = roomManager.getRoom(payload.code);
    if (room?.currentQuestion?.type === 'plugin_game') {
      const closed = roomManager.closeQuestion(payload.code, room.currentQuestion.id);
      if (closed) {
        io.to(payload.code).emit('question-closed', closed);
        io.to(payload.code).emit('plugin-stopped', payload.result);
      }
    }
  });

  socket.on('disconnect', () => {
    pluginMessageTimestamps.delete(socket.id);
    const { room, leftParticipantId, isHost } = roomManager.handleDisconnect(socket.id);
    if (room) {
      if (isHost) {
        console.log(`[Room] Host left, closing room ${room.code}`);
        io.to(room.code).emit('room-closed');
      } else if (leftParticipantId) {
        console.log(`[Room] Participant ${leftParticipantId} disconnected from room ${room.code}`);
        io.to(room.code).emit('participant-left', leftParticipantId);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`ðŸš€ InixPoint Server running on http://localhost:${PORT}`);
});
