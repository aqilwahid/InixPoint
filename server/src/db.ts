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

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      total_participants INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      owner_id TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
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
}

export function saveRoomReport(room: Room) {
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO quiz_sessions 
    (code, title, status, total_participants, total_questions, created_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
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
    Date.now()
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
