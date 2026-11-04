import { Room, Participant, Question, Answer } from '@inixpoint/shared';
import { saveRoomReport } from './db.js';

export class RoomManager {
  // in-memory map for fast state
  private rooms = new Map<string, Room>();
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
      createdAt: Date.now()
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, { code, isHost: true });
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  joinRoom(code: string, socketId: string, name: string): { room?: Room; participant?: Participant; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Kode ruangan tidak ditemukan' };
    if (room.status === 'finished') return { error: 'Sesi kuis ini sudah selesai' };

    const participant: Participant = {
      id: socketId,
      name: name.trim() || 'Peserta',
      score: 0,
      joinedAt: Date.now(),
      connected: true
    };

    room.participants[socketId] = participant;
    this.socketToRoom.set(socketId, { code, isHost: false, participantId: socketId });
    return { room, participant };
  }

  startQuestion(code: string, qData: Omit<Question, 'id' | 'status' | 'createdAt'>): Question | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;

    const question: Question = {
      ...qData,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'active',
      createdAt: Date.now()
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

    const participant = room.participants[participantId];
    if (!participant) return undefined;

    // Check if participant already answered
    const existingIndex = (room.answers[questionId] || []).findIndex(a => a.participantId === participantId);
    let isCorrect = undefined;

    if (question.type === 'multiple_choice' && question.options?.hasCorrectAnswer) {
      isCorrect = Number(content) === question.options.correctIndex;
      if (isCorrect) participant.score += 10;
    }

    const answer: Answer = {
      id: 'ans_' + Date.now() + '_' + participantId.substring(0, 4),
      questionId,
      participantId,
      participantName: participant.name,
      content,
      submittedAt: Date.now(),
      isCorrect
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
      return { room, leftParticipantId: binding.participantId, isHost: false };
    }

    return { room };
  }
}
