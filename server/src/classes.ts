import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import type { Class } from '@inixpoint/shared';

export function createClass(ownerId: string, name: string, description?: string): Class {
  const id = randomBytes(8).toString('hex');
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO classes (id, name, description, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, description || null, ownerId, now, now);
  return { id, name, description, ownerId, createdAt: now, updatedAt: now };
}

export function getClassesByOwner(ownerId: string): Class[] {
  const stmt = db.prepare(`SELECT * FROM classes WHERE owner_id = ? ORDER BY created_at DESC`);
  const rows = stmt.all(ownerId) as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    ownerId: r.owner_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getClassById(id: string, ownerId: string): Class | null {
  const stmt = db.prepare(`SELECT * FROM classes WHERE id = ? AND owner_id = ?`);
  const row = stmt.get(id, ownerId) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateClass(id: string, ownerId: string, updates: { name?: string; description?: string }): Class | null {
  const existing = getClassById(id, ownerId);
  if (!existing) return null;
  const name = updates.name ?? existing.name;
  const description = updates.description ?? existing.description;
  const updatedAt = Date.now();
  const stmt = db.prepare(`UPDATE classes SET name = ?, description = ?, updated_at = ? WHERE id = ? AND owner_id = ?`);
  stmt.run(name, description || null, updatedAt, id, ownerId);
  return { ...existing, name, description, updatedAt };
}

export function deleteClass(id: string, ownerId: string): boolean {
  const stmt = db.prepare(`DELETE FROM classes WHERE id = ? AND owner_id = ?`);
  const result = stmt.run(id, ownerId);
  return result.changes > 0;
}

export interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  totalScore: number;
  totalStars: number;
  correctCount: number;
  totalAnswers: number;
  averageResponseSec: number;
}

export function getClassLeaderboard(classId: string, ownerId: string): LeaderboardEntry[] {
  const classObj = getClassById(classId, ownerId);
  if (!classObj) return [];

  const stmt = db.prepare(`
    SELECT 
      LOWER(TRIM(qa.participant_name)) as participant_id,
      MAX(qa.participant_name) as participant_name,
      COALESCE(SUM(qa.points_awarded), 0) as total_score,
      COALESCE(SUM(qa.stars_earned), 0) as total_stars,
      SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      COUNT(*) as total_answers,
      COALESCE(AVG(qa.response_duration_sec), 0) as avg_response_sec
    FROM quiz_answers qa
    JOIN quiz_sessions qs ON qa.room_code = qs.code
    WHERE qs.class_id = ?
    GROUP BY LOWER(TRIM(qa.participant_name))
    ORDER BY total_score DESC, total_stars DESC
  `);

  const rows = stmt.all(classId) as any[];
  return rows.map(r => ({
    participantId: r.participant_id,
    participantName: r.participant_name,
    totalScore: r.total_score,
    totalStars: r.total_stars,
    correctCount: r.correct_count,
    totalAnswers: r.total_answers,
    averageResponseSec: r.avg_response_sec,
  }));
}
