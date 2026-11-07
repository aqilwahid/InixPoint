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

    CREATE TABLE IF NOT EXISTS custom_plugins (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      html_content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugin_reports (
      id TEXT PRIMARY KEY,
      plugin_id TEXT NOT NULL,
      reporter_id TEXT,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
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
      
      // R4-F11 Migration: add class_roster table
      try { db.exec(`CREATE TABLE IF NOT EXISTS class_roster (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already exists')) throw error;
      }
      
      // R4-G06/07 Migration: add level config table
      try { db.exec(`CREATE TABLE IF NOT EXISTS level_config (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        min_stars INTEGER NOT NULL,
        badge_emoji TEXT NOT NULL
      )`); } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already exists')) throw error;
      }
      
      // Initialize default 10 levels
      const defaultLevels = [
        [1, 'Beginner', 0, '🌱'], [2, 'Learner', 10, '📚'], [3, 'Explorer', 25, '🔍'],
        [4, 'Achiever', 50, '🎯'], [5, 'Expert', 100, '⭐'], [6, 'Master', 200, '🏆'],
        [7, 'Champion', 350, '👑'], [8, 'Legend', 550, '🔥'], [9, 'Hero', 800, '💎'],
        [10, 'Ultimate', 1100, '🚀']
      ];
      for (const [id, name, min, badge] of defaultLevels) {
        try { db.prepare(`INSERT OR IGNORE INTO level_config (id, name, min_stars, badge_emoji) VALUES (?, ?, ?, ?)`).run(id, name, min, badge); } catch {}
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

// R4-G06/07: Level system
export function getLevelByStars(stars: number): { id: number; name: string; minStars: number; badgeEmoji: string } | null {
  const stmt = db.prepare(`SELECT * FROM level_config WHERE min_stars <= ? ORDER BY min_stars DESC LIMIT 1`);
  const row = stmt.get(stars) as any;
  if (!row) return null;
  return { id: row.id, name: row.name, minStars: row.min_stars, badgeEmoji: row.badge_emoji };
}

export function getAllLevels() {
  const stmt = db.prepare(`SELECT * FROM level_config ORDER BY id`);
  const rows = stmt.all() as any[];
  return rows.map(r => ({ id: r.id, name: r.name, minStars: r.min_stars, badgeEmoji: r.badge_emoji }));
}

// R4-R05: Per-question analytics
export interface QuestionAnalytics {
  questionId: string;
  totalAnswers: number;
  correctAnswers: number;
  correctPercent: number;
  avgResponseSec: number;
  avgPoints: number;
  answerDistribution: Record<string, number>;
}

export function getQuestionAnalytics(roomCode: string, questionId: string): QuestionAnalytics | null {
  const answers = db.prepare('SELECT * FROM quiz_answers WHERE room_code = ? AND question_id = ?').all(roomCode, questionId) as any[];
  if (answers.length === 0) return null;

  const correctCount = answers.filter(a => a.is_correct).length;
  const totalResponseTime = answers.reduce((sum, a) => sum + (a.response_duration_sec || 0), 0);
  const totalPoints = answers.reduce((sum, a) => sum + (a.points_awarded || 0), 0);
  
  const distribution: Record<string, number> = {};
  for (const ans of answers) {
    const key = ans.content || '(empty)';
    distribution[key] = (distribution[key] || 0) + 1;
  }

  return {
    questionId,
    totalAnswers: answers.length,
    correctAnswers: correctCount,
    correctPercent: Math.round((correctCount / answers.length) * 100),
    avgResponseSec: answers.length > 0 ? Math.round((totalResponseTime / answers.length) * 10) / 10 : 0,
    avgPoints: answers.length > 0 ? Math.round(totalPoints / answers.length) : 0,
    answerDistribution: distribution,
  };
}

// R5 PL-08 & PL-10: Custom plugin management and kill-switch
export function saveCustomPlugin(plugin: {
  id: string;
  ownerId?: string;
  name: string;
  version: string;
  manifestJson: string;
  htmlContent: string;
}) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO custom_plugins (id, owner_id, name, version, manifest_json, html_content, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
  `);
  stmt.run(plugin.id, plugin.ownerId || null, plugin.name, plugin.version, plugin.manifestJson, plugin.htmlContent, Date.now());
}

export function getCustomPlugins(includeRevoked = false) {
  const sql = includeRevoked
    ? 'SELECT * FROM custom_plugins ORDER BY created_at DESC'
    : "SELECT * FROM custom_plugins WHERE status = 'active' ORDER BY created_at DESC";
  return db.prepare(sql).all() as Array<{
    id: string;
    owner_id: string | null;
    name: string;
    version: string;
    manifest_json: string;
    html_content: string;
    status: string;
    created_at: number;
  }>;
}

export function revokeCustomPlugin(id: string) {
  db.prepare("UPDATE custom_plugins SET status = 'revoked' WHERE id = ?").run(id);
}

export function deleteCustomPlugin(id: string, ownerId?: string) {
  if (ownerId) {
    db.prepare('DELETE FROM custom_plugins WHERE id = ? AND owner_id = ?').run(id, ownerId);
  } else {
    db.prepare('DELETE FROM custom_plugins WHERE id = ?').run(id);
  }
}

export function reportPluginIssue(pluginId: string, reporterId: string | undefined, reason: string) {
  const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare('INSERT INTO plugin_reports (id, plugin_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, pluginId, reporterId || null, reason, Date.now()
  );
  return id;
}
