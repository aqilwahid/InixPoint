import assert from 'node:assert';
import { RoomManager } from './roomManager.js';

const manager = new RoomManager();
const room = manager.createRoom('Q&A self-check', 'host');
const joined = manager.joinRoom(room.code, 'participant', 'Sari');
assert(joined.participant);

const submitted = manager.submitQna(room.code, 'participant', 'Bisa dijelaskan lagi?');
assert(submitted);
assert.strictEqual(submitted.status, 'open');
assert.strictEqual(manager.upvoteQna(room.code, submitted.id)?.upvotes, 1);
assert.strictEqual(manager.markQna(room.code, submitted.id, 'answered')?.status, 'answered');
assert.strictEqual(manager.setQnaEnabled(room.code, false)?.qnaEnabled, false);
assert.strictEqual(manager.submitQna(room.code, 'missing', 'x'), undefined);

console.log('✅ test-qna: All assertions passed!');
