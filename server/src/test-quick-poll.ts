import assert from 'node:assert';
import { RoomManager } from './roomManager.js';
import type { Question } from '@inixpoint/shared';

console.log('Testing Quick Poll logic (Templates, Tally, Scoring)...');

const manager = new RoomManager();
const room = manager.createRoom('Quick Poll Test Room', 'host_sock');

const res1 = manager.joinRoom(room.code, 'sock_p1', 'Alice');
const res2 = manager.joinRoom(room.code, 'sock_p2', 'Bob');
const res3 = manager.joinRoom(room.code, 'sock_p3', 'Charlie');

const p1 = res1.participant!;
const p2 = res2.participant!;
const p3 = res3.participant!;

// Start Quick Poll question
const qData: Omit<Question, 'id' | 'status' | 'createdAt'> = {
  type: 'quick_poll',
  prompt: 'Bagaimana pemahaman Anda mengenai materi hari ini?',
  pointsPerCorrect: 5,
  options: {
    template: 'likert_5',
    options: [
      { id: 'strongly_agree', label: 'Strongly agree', emoji: '😃', color: '#10b981' },
      { id: 'agree', label: 'Agree', emoji: '🙂', color: '#84cc16' },
      { id: 'neutral', label: 'Neutral', emoji: '😐', color: '#f59e0b' },
      { id: 'disagree', label: 'Disagree', emoji: '🙁', color: '#f97316' },
      { id: 'strongly_disagree', label: 'Strongly disagree', emoji: '😡', color: '#ef4444' }
    ]
  }
};

const q = manager.startQuestion(room.code, qData)!;
assert.ok(q && q.id, 'Question started');

// Alice votes strongly_agree
const ans1 = manager.submitAnswer(room.code, q.id, 'sock_p1', 'strongly_agree')!;
assert.strictEqual(ans1.isCorrect, true);
assert.strictEqual(ans1.pointsAwarded, 5);
assert.strictEqual(p1.score, 5);
assert.strictEqual(p1.stars, 2);

// Bob votes strongly_agree
const ans2 = manager.submitAnswer(room.code, q.id, 'sock_p2', 'strongly_agree')!;
assert.strictEqual(ans2.content, 'strongly_agree');
assert.strictEqual(p2.score, 5);

// Charlie votes neutral
const ans3 = manager.submitAnswer(room.code, q.id, 'sock_p3', 'neutral')!;
assert.strictEqual(ans3.content, 'neutral');

// Tally verification
const allAnswers = [ans1, ans2, ans3];
const stronglyAgreeCount = allAnswers.filter(a => a.content === 'strongly_agree').length;
const neutralCount = allAnswers.filter(a => a.content === 'neutral').length;
assert.strictEqual(stronglyAgreeCount, 2, '2 voters for strongly agree');
assert.strictEqual(neutralCount, 1, '1 voter for neutral');

console.log('All Quick Poll assertions passed! ✓');
