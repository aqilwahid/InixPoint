import assert from 'node:assert';
import { RoomManager } from './roomManager.js';
import type { Question } from '@inixpoint/shared';

// Self-check runnable test for matching scoring and leaderboard
console.log('Testing Matching Question logic...');

const manager = new RoomManager();
const room = manager.createRoom('Uji Coba Matching', 'host_socket_1');
assert.ok(room.code, 'Room code must exist');

// Join participants
const res1 = manager.joinRoom(room.code, 'sock_p1', 'Budi');
const res2 = manager.joinRoom(room.code, 'sock_p2', 'Siti');
const p1 = res1.participant;
const p2 = res2.participant;
assert.ok(p1 && p2, 'Participants must join');

// Start matching question
const qData: Omit<Question, 'id' | 'status' | 'createdAt'> = {
  type: 'matching',
  prompt: 'Cocokkan negara dengan ibu kotanya',
  pointsPerCorrect: 10,
  options: {
    pairs: [
      { id: 'pair_1', left: 'Indonesia', right: 'Jakarta' },
      { id: 'pair_2', left: 'Jepang', right: 'Tokyo' }
    ]
  }
};

const q = manager.startQuestion(room.code, qData);
assert.ok(q && q.id, 'Question started');

// Budi answers 100% correct
const ans1 = manager.submitAnswer(room.code, q.id, 'sock_p1', JSON.stringify({
  pair_1: 'Jakarta',
  pair_2: 'Tokyo'
}));
assert.strictEqual(ans1?.isCorrect, true, 'Budi should be 100% correct');
assert.strictEqual(ans1?.pointsAwarded, 10, 'Budi should get 10 points');
assert.strictEqual(p1.score, 10, 'Budi score should be 10');
assert.strictEqual(p1.correctCount, 1, 'Budi correctCount should be 1');

// Siti answers 50% correct (1 out of 2)
const ans2 = manager.submitAnswer(room.code, q.id, 'sock_p2', JSON.stringify({
  pair_1: 'Jakarta',
  pair_2: 'Kyoto' // wrong
}));
assert.strictEqual(ans2?.isCorrect, false, 'Siti is not 100% correct');
assert.strictEqual(ans2?.pointsAwarded, 5, 'Siti should get 5 proportional points');
assert.strictEqual(p2.score, 5, 'Siti score should be 5');

console.log('All matching scoring assertions passed! ✓');
