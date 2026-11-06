import assert from 'node:assert';
import { RoomManager } from './roomManager.js';

// Self-check for manual star awarding
const rm = new RoomManager();
const room = rm.createRoom('Sesi Manual Star Test', 'host_123');
const { participant } = rm.joinRoom(room.code, 'part_1', 'Budi Santoso');

assert(participant, 'Participant should be created');
assert.strictEqual(participant.stars ?? 0, 0, 'Initial stars should be 0');

// Award 1 star
const updated1 = rm.awardStar(room.code, 'part_1', 1);
assert(updated1, 'awardStar should return updated participant');
assert.strictEqual(updated1.stars, 1, 'Participant should now have 1 star');

// Award 2 more stars
const updated2 = rm.awardStar(room.code, 'part_1', 2);
assert.strictEqual(updated2?.stars, 3, 'Participant should now have 3 stars');

// Non-existent participant/room returns undefined
assert.strictEqual(rm.awardStar(room.code, 'ghost_user', 1), undefined);
assert.strictEqual(rm.awardStar('999999', 'part_1', 1), undefined);

console.log('✅ test-award-star: All assertions passed!');
