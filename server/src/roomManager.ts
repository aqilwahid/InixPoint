import type { Room, Participant, Question, Answer, MultipleChoiceOptions, MatchingOptions, RankingOptions, QnaItem } from '@inixpoint/shared';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { saveRoomReport } from './db.js';

export class RoomManager {
  // in-memory map for fast state
  private rooms = new Map<string, Room>();
  // Host tokens stay server-side: Room is broadcast to participants, so never put the token in it.
  private hostTokens = new Map<string, string>();
  // Session tokens for participant reconnection within grace period (5 min)
  private sessionTokens = new Map<string, string>(); // participantId -> sessionToken

  getHostToken(code: string): string | undefined {
    return this.hostTokens.get(code);
  }

  verifyHost(code: string, token: unknown): boolean {
    const expected = this.hostTokens.get(code);
    if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  generateSessionToken(): string {
    return randomBytes(16).toString('hex');
  }

  private socketToRoom = new Map<string, { code: string; isHost: boolean; participantId?: string }>();

  generateCode(): string {
    let code = '';
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(title: string, hostSocketId: string): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      title: title || 'InixPoint Interactive Session',
      hostSocketId,
      status: 'waiting',
      participants: {},
      questions: [],
      answers: {},
      qna: [], // ponnytail: live Q&A entries
      qnaEnabled: true,
      createdAt: Date.now()
    };

    this.rooms.set(code, room);
    this.hostTokens.set(code, randomBytes(16).toString('hex'));
    this.socketToRoom.set(hostSocketId, { code, isHost: true });
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  joinRoom(code: string, socketId: string, name: string): { room?: Room; participant?: Participant; sessionToken?: string; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Kode ruangan tidak ditemukan' };
    if (room.status === 'finished') return { error: 'Sesi kuis ini sudah selesai' };

    const sessionToken = this.generateSessionToken();
    const participant: Participant = {
      id: socketId,
      name: name.trim() || 'Peserta',
      score: 0,
      joinedAt: Date.now(),
      connected: true
    };

    room.participants[socketId] = participant;
    this.sessionTokens.set(socketId, sessionToken);
    this.socketToRoom.set(socketId, { code, isHost: false, participantId: socketId });
    return { room, participant, sessionToken };
  }

  // ponytail: reconnect within 5-min grace period; upgrade to configurable TTL if multi-tier requested
  reconnectParticipant(code: string, sessionToken: string, newSocketId: string): { room?: Room; participant?: Participant; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Kode ruangan tidak ditemukan' };

    // Find participant by sessionToken
    let participant: Participant | undefined;
    let oldParticipantId: string | undefined;
    for (const [pid, p] of Object.entries(room.participants)) {
      if (this.sessionTokens.get(pid) === sessionToken) {
        participant = p;
        oldParticipantId = pid;
        break;
      }
    }

    if (!participant || !oldParticipantId) return { error: 'Session tidak ditemukan atau kadaluarsa' };

    // Check grace period (5 minutes)
    const GRACE_PERIOD_MS = 5 * 60 * 1000;
    if (participant.disconnectedAt && (Date.now() - participant.disconnectedAt > GRACE_PERIOD_MS)) {
      return { error: 'Session sudah kadaluarsa (>5 menit offline)' };
    }

    // Re-bind to new socket.id
    delete room.participants[oldParticipantId];
    participant.id = newSocketId;
    participant.connected = true;
    participant.disconnectedAt = undefined;
    room.participants[newSocketId] = participant;

    // Update maps
    this.sessionTokens.delete(oldParticipantId);
    this.sessionTokens.set(newSocketId, sessionToken);
    this.socketToRoom.delete(oldParticipantId);
    this.socketToRoom.set(newSocketId, { code, isHost: false, participantId: newSocketId });

    return { room, participant };
  }

  startQuestion(code: string, qData: Omit<Question, 'id' | 'status' | 'createdAt'>): Question | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;

    const now = Date.now();
    const question: Question = {
      ...qData,
      id: 'q_' + now + '_' + Math.random().toString(36).substring(2, 6),
      status: 'active',
      createdAt: now,
      timeStartedAt: now
    };

    room.currentQuestion = question;
    room.questions.push(question);
    if (!room.answers[question.id]) {
      room.answers[question.id] = [];
    }
    return question;
  }

  submitAnswer(code: string, questionId: string, participantId: string, content: string): Answer | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;

    const question = room.currentQuestion;
    if (!question || question.id !== questionId || question.status !== 'active') {
      return undefined;
    }

    // ponytail: reject answers after timer expires
    if (question.timeLimitSec && question.timeStartedAt) {
      const elapsed = (Date.now() - question.timeStartedAt) / 1000;
      if (elapsed > question.timeLimitSec) {
        return undefined; // too late
      }
    }

    const participant = room.participants[participantId];
    if (!participant) return undefined;

    // Initialize stats if not present
    if (!participant.answeredCount) participant.answeredCount = 0;
    if (!participant.correctCount) participant.correctCount = 0;

    // Check if participant already answered (prevent duplicate scoring)
    const existingIndex = (room.answers[questionId] || []).findIndex(a => a.participantId === participantId);
    const isNewAnswer = existingIndex < 0;

    // Calculate correctness and points
    let isCorrect = false;
    let pointsAwarded = 0;
    const pointsPerCorrect = question.pointsPerCorrect ?? 10;

    if (question.type === 'multiple_choice' && question.options) {
      const mcOptions = question.options as MultipleChoiceOptions;
      if (mcOptions.hasCorrectAnswer) {
        isCorrect = Number(content) === mcOptions.correctIndex;
        pointsAwarded = isCorrect ? pointsPerCorrect : 0;
      }
    } else if (question.type === 'matching' && question.options) {
      const matchOptions = question.options as MatchingOptions;
      if (matchOptions.pairs && matchOptions.pairs.length > 0) {
        try {
          const userMatches: Record<string, string> = JSON.parse(content);
          const pairs = matchOptions.pairs;
          const correctCount = pairs.filter(p => userMatches[p.id] === p.right).length;
          isCorrect = correctCount === pairs.length;
          pointsAwarded = isCorrect ? pointsPerCorrect : Math.round((correctCount / pairs.length) * pointsPerCorrect);
        } catch {
          isCorrect = false;
          pointsAwarded = 0;
        }
      }
      } else if (question.type === 'ranking' && question.options) {
      const ranking = question.options as RankingOptions;
      try {
      const order: string[] = JSON.parse(content);
      const expected = ranking.correctOrder || ranking.items;
      if (Array.isArray(order) && order.length === expected.length && new Set(order).size === order.length && order.every(item => expected.includes(item))) {
      const correctCount = order.filter((item, index) => item === expected[index]).length;
      isCorrect = correctCount === expected.length;
      pointsAwarded = Math.round((correctCount / expected.length) * pointsPerCorrect);
      }
      } catch { /* invalid ranking is not graded */ }
      } else if (question.type === 'short_answer' && question.correctAnswers?.length) {
      const normalized = content.trim().toLocaleLowerCase();
      isCorrect = question.correctAnswers.some(answer => answer.trim().toLocaleLowerCase() === normalized);
      pointsAwarded = isCorrect ? pointsPerCorrect : 0;
    } else if (question.type === 'quick_poll') {
      isCorrect = true;
      pointsAwarded = question.pointsPerCorrect ?? 5;
    }

    // Calculate response speed and gamification stars
    const startTime = question.timeStartedAt || question.createdAt;
    const durationMs = Math.max(300, Date.now() - startTime);
    const responseDurationSec = Number((durationMs / 1000).toFixed(1));
    const starsEarned = isCorrect ? ({ easy: 1, medium: 2, hard: 3 }[question.difficulty || 'medium']) : 1;

    // Update participant stats (only if new answer)
    if (isNewAnswer) {
      participant.answeredCount = (participant.answeredCount || 0) + 1;
      if (isCorrect) {
        participant.correctCount = (participant.correctCount || 0) + 1;
      }
      participant.stars = (participant.stars || 0) + starsEarned;
      participant.totalResponseTimeMs = (participant.totalResponseTimeMs || 0) + durationMs;
      participant.averageSpeedSec = Number(((participant.totalResponseTimeMs / participant.answeredCount) / 1000).toFixed(1));
    } else {
      // If updating existing answer, recalculate
      const oldAnswer = room.answers[questionId][existingIndex];
      if (oldAnswer.isCorrect && !isCorrect) {
        participant.correctCount = Math.max(0, (participant.correctCount || 0) - 1);
        participant.stars = Math.max(0, (participant.stars || 0) - 1);
      } else if (!oldAnswer.isCorrect && isCorrect) {
        participant.correctCount = (participant.correctCount || 0) + 1;
        participant.stars = (participant.stars || 0) + 1;
      }
    }

    // Update score
    if (isNewAnswer) {
      participant.score += pointsAwarded;
    } else {
      // Recalculate score difference
      const oldPoints = room.answers[questionId][existingIndex].pointsAwarded || 0;
      participant.score = Math.max(0, participant.score - oldPoints + pointsAwarded);
    }

    const answer: Answer = {
      id: 'ans_' + Date.now() + '_' + participantId.substring(0, 4),
      questionId,
      participantId,
      participantName: participant.name,
      content,
      submittedAt: Date.now(),
      isCorrect,
      pointsAwarded,
      responseDurationSec,
      starsEarned
    };

    if (existingIndex >= 0) {
      room.answers[questionId][existingIndex] = answer;
    } else {
      room.answers[questionId].push(answer);
    }

    return answer;
  }

  closeQuestion(code: string, questionId: string): { questionId: string; answers: Answer[] } | undefined {
    const room = this.rooms.get(code);
    if (!room || !room.currentQuestion || room.currentQuestion.id !== questionId) return undefined;

    room.currentQuestion.status = 'closed';
    const answers = room.answers[questionId] || [];
    saveRoomReport(room);
    return { questionId, answers };
  }

  // Live Q&A: participant submits a question
  submitQna(code: string, participantId: string, content: string): QnaItem | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    const participant = room.participants[participantId];
    if (!participant) return undefined;
    const qna: QnaItem = {
      id: 'qna_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      participantId,
      participantName: participant.name,
      content,
      upvotes: 0,
      status: 'open',
      createdAt: Date.now()
    };
    room.qna.push(qna);
    return qna;
  }

  // Presenter upvotes a Q&A entry
  upvoteQna(code: string, qnaId: string): QnaItem | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    const item = room.qna.find(q => q.id === qnaId);
    if (!item) return undefined;
    item.upvotes += 1;
    return item;
  }

  markQna(code: string, qnaId: string, status: QnaItem['status']): QnaItem | undefined {
    const item = this.rooms.get(code)?.qna.find(q => q.id === qnaId);
    if (!item) return undefined;
  item.status = status;
    return item;
  }
  setQnaEnabled(code: string, enabled: boolean): Room | undefined {
  const room = this.rooms.get(code);
  if (!room) return undefined;
  room.qnaEnabled = enabled;
  return room;
  }

  handleDisconnect(socketId: string): { room?: Room; leftParticipantId?: string; isHost?: boolean } {
    const binding = this.socketToRoom.get(socketId);
    if (!binding) return {};

    const room = this.rooms.get(binding.code);
    this.socketToRoom.delete(socketId);

    if (!room) return {};

    if (binding.isHost) {
      // Room host left
      room.status = 'finished';
      saveRoomReport(room);
      return { room, isHost: true };
    } else if (binding.participantId && room.participants[binding.participantId]) {
      room.participants[binding.participantId].connected = false;
      room.participants[binding.participantId].disconnectedAt = Date.now();
      return { room, leftParticipantId: binding.participantId, isHost: false };
    }

    return { room };
  }

  // ponytail: manual stars given by presenter; upgrade to custom point weighting or badges if multi-tier rewards requested
  awardStar(code: string, participantId: string, count: number = 1): Participant | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    const participant = room.participants[participantId];
    if (!participant) return undefined;

    participant.stars = Math.max(0, (participant.stars || 0) + count);
    return participant;
  }

  // Closes every active question whose timer ran out; caller broadcasts the results.
  // ponytail: O(rooms) scan per tick; switch to per-question setTimeout if room count gets large.
  closeExpired(now = Date.now()): Array<{ code: string; questionId: string; answers: Answer[] }> {
    const closed: Array<{ code: string; questionId: string; answers: Answer[] }> = [];
    for (const [code, room] of this.rooms) {
      const q = room.currentQuestion;
      if (q?.status !== 'active' || !q.timeLimitSec || !q.timeStartedAt) continue;
      if (now - q.timeStartedAt < q.timeLimitSec * 1000) continue;
      const res = this.closeQuestion(code, q.id);
      if (res) closed.push({ code, ...res });
    }
    return closed;
  }

  closeRoom(code: string): Room | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    room.status = 'finished';
    saveRoomReport(room);
    return room;
  }

  kickParticipant(code: string, participantId: string): { room?: Room; kicked?: Participant; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    const participant = room.participants[participantId];
    if (!participant) return { error: 'Participant not found' };
    delete room.participants[participantId];
    this.sessionTokens.delete(participantId);
    this.socketToRoom.delete(participantId);
    return { room, kicked: participant };
  }

  // ponytail: cleanup disconnected participants after 5-min grace period
  cleanupStaleParticipants(now = Date.now()): number {
    const GRACE_PERIOD_MS = 5 * 60 * 1000;
    let cleaned = 0;
    for (const room of this.rooms.values()) {
      for (const [pid, p] of Object.entries(room.participants)) {
        if (!p.connected && p.disconnectedAt && (now - p.disconnectedAt > GRACE_PERIOD_MS)) {
          delete room.participants[pid];
          this.sessionTokens.delete(pid);
          cleaned++;
        }
      }
    }
    return cleaned;
  }
}
