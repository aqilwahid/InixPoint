import assert from 'node:assert/strict';
import { RoomManager } from './roomManager.js';

const manager = new RoomManager();
const room = manager.createRoom('R3', 'host');
const joined = manager.joinRoom(room.code, 'p1', 'A');
const participant = joined.participant;
assert.ok(participant);
const question = manager.startQuestion(room.code, { type: 'ranking', prompt: 'Order', options: { items: ['a', 'b'], correctOrder: ['a', 'b'] }, difficulty: 'hard' });
assert.ok(question);
assert.equal(manager.submitAnswer(room.code, question.id, participant!.id, JSON.stringify(['a', 'b']))?.starsEarned, 3);
assert.equal(manager.submitAnswer(room.code, question.id, participant!.id, JSON.stringify(['b', 'a']))?.starsEarned, 1);
const image = manager.startQuestion(room.code, { type: 'image_upload', prompt: 'Image' });
assert.ok(image);
assert.equal(manager.submitAnswer(room.code, image.id, participant!.id, 'not-an-image'), undefined);
console.log('R3 assertions passed!');
