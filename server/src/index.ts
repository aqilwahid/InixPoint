import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents 
} from '@inixpoint/shared';
import { initDatabase, getRoomSummary } from './db.js';
import { RoomManager } from './roomManager.js';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

initDatabase();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }
});

const roomManager = new RoomManager();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'InixPoint Server' });
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

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('create-room', (payload, callback) => {
    try {
      const room = roomManager.createRoom(payload.title, socket.id);
      socket.join(room.code);
      console.log(`[Room] Created room ${room.code} by host ${socket.id}`);
      callback({ success: true, room });
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
    console.log(`[Room] ${result.participant.name} (${socket.id}) joined ${result.room.code}`);

    // Notify room host and everyone in the room
    socket.to(result.room.code).emit('participant-joined', result.participant);
    callback({ success: true, room: result.room });
  });

  socket.on('start-question', (payload) => {
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

  socket.on('close-question', (payload) => {
    const closed = roomManager.closeQuestion(payload.code, payload.questionId);
    if (closed) {
      console.log(`[Question] Closed question ${payload.questionId} in room ${payload.code}`);
      io.to(payload.code).emit('question-closed', closed);
    }
  });

  socket.on('disconnect', () => {
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
  console.log(`🚀 InixPoint Server running on http://localhost:${PORT}`);
});
