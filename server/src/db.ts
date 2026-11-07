import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type { Room } from '@inixpoint/shared';

// ponytail: single local sqlite file for persistent reports; upgrade to postgres when distributed
const dbPath = path.resolve(process.cwd(), 'inixpoint.sqlite');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'presenter',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      total_participants INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      owner_id TEXT,
      class_id TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      question_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      content TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      is_correct INTEGER,
      points_awarded INTEGER DEFAULT 0,
      response_duration_sec REAL DEFAULT 0,
      stars_earned INTEGER DEFAULT 0,
      FOREIGN KEY (room_code) REFERENCES quiz_sessions(code)
    );
  `);
      for (const [column, type] of [['points_awarded', 'INTEGER DEFAULT 0'], ['response_duration_sec', 'REAL DEFAULT 0'], ['stars_earned', 'INTEGER DEFAULT 0']] as const) {
      try { db.exec(`ALTER TABLE quiz_answers ADD COLUMN ${column} ${type}`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error;
      }
      }

      // R4 Migration: add owner_id to quiz_sessions
      try { db.exec(`ALTER TABLE quiz_sessions ADD COLUMN owner_id TEXT REFERENCES users(id)`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error;
      }

      // R4-F07 Migration: add class_id to quiz_sessions
      try { db.exec(`ALTER TABLE quiz_sessions ADD COLUMN class_id TEXT REFERENCES classes(id)`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error;
      }

      // R4-F08/09 Migration: add is_locked to classes
      try { db.exec(`ALTER TABLE classes ADD COLUMN is_locked INTEGER DEFAULT 0`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error;
      }
}

export function saveRoomReport(room: Room) {
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO quiz_sessions 
    (code, title, status, total_participants, total_questions, created_at, closed_at, class_id, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const participantCount = Object.keys(room.participants).length;
  const questionCount = room.questions.length;

  insertSession.run(
    room.code,
    room.title,
    room.status,
    participantCount,
    questionCount,
    room.createdAt,
    Date.now(),
    room.classId || null,
    room.ownerId || null
  );

  const insertAnswer = db.prepare(`
    INSERT OR REPLACE INTO quiz_answers
    (id, room_code, question_id, participant_id, participant_name, content, submitted_at, is_correct, points_awarded, response_duration_sec, stars_earned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [qId, answers] of Object.entries(room.answers)) {
    for (const ans of answers) {
      insertAnswer.run(
        ans.id,
        room.code,
        qId,
        ans.participantId,
        ans.participantName,
        ans.content,
        ans.submittedAt,
        ans.isCorrect ? 1 : 0
        ,
        ans.pointsAwarded || 0,
        ans.responseDurationSec || 0,
        ans.starsEarned || 0
      );
    }
  }
}

export function getRoomSummary(roomCode: string) {
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE code = ?').get(roomCode);
  const answers = db.prepare('SELECT * FROM quiz_answers WHERE room_code = ?').all(roomCode);
  return { session, answers };
}

// R4-R04: Session history and reporting
export interface SessionReport {
  code: string;
  title: string;
  status: string;
  createdAt: number;
  closedAt: number;
  participants: {
    total: number;
    data: { name: string; score: number; correct: number; total: number; avgResponseSec: number }[];
  };
  questions: {
    total: number;
    avgCorrectPercent: number;
  };
  metrics: {
    avgScore: number;
    avgResponseSec: number;
    totalPoints: number;
  };
}

export function getSessionReport(roomCode: string): SessionReport | null {
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE code = ?').get(roomCode) as any;
  if (!session) return null;

  const answers = db.prepare('SELECT * FROM quiz_answers WHERE room_code = ? ORDER BY submitted_at').all(roomCode) as any[];

  const participantStats = new Map<string, { name: string; score: number; correct: number; total: number; responseTime: number[] }>();
  for (const ans of answers) {
    if (!participantStats.has(ans.participant_id)) {
      participantStats.set(ans.participant_id, { name: ans.participant_name, score: 0, correct: 0, total: 0, responseTime: [] });
    }
    const stat = participantStats.get(ans.participant_id)!;
    stat.score += ans.points_awarded || 0;
    if (ans.is_correct) stat.correct++;
    stat.total++;
    if (ans.response_duration_sec) stat.responseTime.push(ans.response_duration_sec);
  }

  const participants = Array.from(participantStats.values()).map(s => ({
    name: s.name,
    score: s.score,
    correct: s.correct,
    total: s.total,
    avgResponseSec: s.responseTime.length ? s.responseTime.reduce((a, b) => a + b) / s.responseTime.length : 0,
  }));

  const questionStats = new Map<string, { correct: number; total: number }>();
  for (const ans of answers) {
    if (!questionStats.has(ans.question_id)) questionStats.set(ans.question_id, { correct: 0, total: 0 });
    const stat = questionStats.get(ans.question_id)!;
    if (ans.is_correct) stat.correct++;
    stat.total++;
  }

  const avgCorrectPercent = questionStats.size > 0
    ? Array.from(questionStats.values()).reduce((sum, q) => sum + (q.correct / q.total), 0) / questionStats.size * 100
    : 0;

  const totalScore = participants.reduce((s, p) => s + p.score, 0);
  const avgScore = participants.length > 0 ? totalScore / participants.length : 0;
  const avgResponseSec = participants.reduce((s, p) => s + p.avgResponseSec, 0) / (participants.length || 1);

  return {
    code: session.code,
    title: session.title,
    status: session.status,
    createdAt: session.created_at,
    closedAt: session.closed_at,
    participants: { total: participants.length, data: participants.sort((a, b) => b.score - a.score) },
    questions: { total: questionStats.size, avgCorrectPercent: Math.round(avgCorrectPercent) },
    metrics: { avgScore: Math.round(avgScore), avgResponseSec: Math.round(avgResponseSec * 10) / 10, totalPoints: totalScore },
  };
}

export function getSessionsByOwner(ownerId: string) {
  const stmt = db.prepare('SELECT code, title, status, total_participants, total_questions, created_at, closed_at FROM quiz_sessions WHERE owner_id = ? ORDER BY created_at DESC');
  return stmt.all(ownerId);
}
