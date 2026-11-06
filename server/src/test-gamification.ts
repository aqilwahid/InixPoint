import assert from 'node:assert';
import { RoomManager } from './roomManager.js';
import type { Question } from '@inixpoint/shared';

console.log('Testing Gamification logic (Stars, Speed, Ranking)...');

const manager = new RoomManager();
const room = manager.createRoom('Gamification Room', 'host_sock');

const res1 = manager.joinRoom(room.code, 'sock_fast', 'Fast Runner');
const res2 = manager.joinRoom(room.code, 'sock_slow', 'Slow Runner');
const pFast = res1.participant!;
const pSlow = res2.participant!;

// Start question with timestamp in the past to simulate response duration
const qData: Omit<Question, 'id' | 'status' | 'createdAt'> = {
  type: 'multiple_choice',
  prompt: '2 + 2 = ?',
  options: {
    choices: ['3', '4', '5'],
    correctIndex: 1,
    hasCorrectAnswer: true
  }
};

const q = manager.startQuestion(room.code, qData)!;
// Simulate question started 2.0s ago
q.createdAt = Date.now() - 2000;
q.timeStartedAt = q.createdAt;

// Fast runner answers correctly
const ansFast = manager.submitAnswer(room.code, q.id, 'sock_fast', '1')!;
assert.strictEqual(ansFast.isCorrect, true);
assert.strictEqual(ansFast.starsEarned, 2, 'Correct answer awards 2 stars');
assert.strictEqual(pFast.stars, 2);
assert.ok(pFast.averageSpeedSec! >= 1.5, 'Speed calculated in seconds');

// Slow runner answers incorrectly
const ansSlow = manager.submitAnswer(room.code, q.id, 'sock_slow', '0')!;
assert.strictEqual(ansSlow.isCorrect, false);
assert.strictEqual(ansSlow.starsEarned, 1, 'Participation awards 1 star');
assert.strictEqual(pSlow.stars, 1);

console.log('All gamification assertions passed! ✓');
