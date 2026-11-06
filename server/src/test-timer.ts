import { RoomManager } from './roomManager.js';
import assert from 'node:assert';

(async () => {
  const rm = new RoomManager();

  // Create room and start question with 1-second timer
  const room = rm.createRoom('Timer Test', 'host123');
  const token = rm.getHostToken(room.code);
  const joined = rm.joinRoom(room.code, 'p1', 'Alice');
  assert.ok(joined.participant);

  const q = rm.startQuestion(room.code, {
    type: 'multiple_choice',
    prompt: 'Quick question?',
    timeLimitSec: 1,
    options: { choices: ['A', 'B'], correctIndex: 0, hasCorrectAnswer: true }
  });
  assert.ok(q);
  assert.strictEqual(q.timeLimitSec, 1);
  assert.ok(q.timeStartedAt);

  // Answer immediately: should succeed
  const ans1 = rm.submitAnswer(room.code, q.id, 'p1', '0');
  assert.ok(ans1, 'Answer within time limit should succeed');

  // Wait 1100ms, then try answer again: should fail (expired)
  await new Promise(resolve => setTimeout(resolve, 1100));
  const ans2 = rm.submitAnswer(room.code, q.id, 'p1', '1');
  assert.strictEqual(ans2, undefined, 'Answer after timer expired should be rejected');

  // closeExpired should auto-close the question
  const expired = rm.closeExpired(Date.now());
  assert.strictEqual(expired.length, 1, 'Should auto-close one expired question');
  assert.strictEqual(expired[0].questionId, q.id);

  // Room should reflect closed status
  const roomAfter = rm.getRoom(room.code);
  assert.strictEqual(roomAfter?.currentQuestion?.status, 'closed');

  console.log('✅ test-timer: All assertions passed!');
})();
