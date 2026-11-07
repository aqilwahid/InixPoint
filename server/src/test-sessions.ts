import assert from 'node:assert/strict';
import type { Room, Answer } from '@inixpoint/shared';
import { initDatabase, saveRoomReport, getSessionsByOwner, getSessionReport } from './db';
import { registerUser } from './auth';

const stamp = Date.now();
const ans = (id: string, name: string, correct: boolean, pts: number): Answer => ({
  id, questionId: 'q1', participantId: id, participantName: name, content: '0',
  submittedAt: stamp, isCorrect: correct, pointsAwarded: pts, responseDurationSec: 2, starsEarned: 0,
});
const room = (code: string, ownerId: string, answers: Answer[]): Room => ({
  code, title: code, hostSocketId: 'h', status: 'finished', ownerId, participants: {},
  questions: [], answers: { q1: answers }, qna: [], qnaEnabled: false, createdAt: stamp,
});

async function main() {
  initDatabase();
  const owner = await registerUser(`owner${stamp}@t.com`, 'password123', 'Owner');
  const other = await registerUser(`other${stamp}@t.com`, 'password123', 'Other');
  assert(owner.user && other.user);

  saveRoomReport(room(`S1${stamp}`, owner.user.id, [ans('p1', 'Alice', true, 10), ans('p2', 'Bob', false, 0)]));
  saveRoomReport(room(`S2${stamp}`, owner.user.id, [ans('p3', 'Charlie', true, 10)]));
  saveRoomReport(room(`S3${stamp}`, other.user.id, [ans('p4', 'Dan', true, 10)]));

  const sessions = getSessionsByOwner(owner.user.id) as any[];
  assert(sessions.length >= 2);
  assert(sessions.some(s => s.code === `S1${stamp}`));
  assert(sessions.some(s => s.code === `S2${stamp}`));
  assert(!sessions.some(s => s.code === `S3${stamp}`)); // isolation

  const report = getSessionReport(`S1${stamp}`);
  assert(report);
  assert.equal(report.participants.total, 2);
  assert.equal(report.participants.data[0].name, 'Alice');
  assert.equal(report.participants.data[0].score, 10);
  assert.equal(report.questions.total, 1);
  assert(report.metrics.totalPoints >= 10);

  console.log('✅ test-sessions: all assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
