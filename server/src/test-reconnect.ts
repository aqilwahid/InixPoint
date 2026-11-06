import { RoomManager } from './roomManager.js';
import assert from 'node:assert';

(async () => {
  const rm = new RoomManager();

  // Create room
  const room = rm.createRoom('Reconnect Test', 'host1');
  const code = room.code;

  // First join
  const joined1 = rm.joinRoom(code, 'socket1', 'Alice');
  assert.ok(joined1.participant && joined1.sessionToken);
  const sessionToken = joined1.sessionToken;
  const participantId1 = joined1.participant.id; // 'socket1'
  assert.strictEqual(participantId1, 'socket1');

  // Simulate disconnect (5 sec, within grace period)
  const { room: roomAfter } = rm.handleDisconnect('socket1');
  assert.ok(roomAfter);
  assert.strictEqual(roomAfter.participants['socket1'].connected, false);
  assert.ok(roomAfter.participants['socket1'].disconnectedAt);

  // Wait 100ms (well within 5 min)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Reconnect with new socket but same sessionToken
  const rejoined = rm.reconnectParticipant(code, sessionToken, 'socket2');
  assert.ok(rejoined.participant);
  assert.strictEqual(rejoined.participant.name, 'Alice');
  assert.strictEqual(rejoined.participant.connected, true);
  assert.strictEqual(rejoined.participant.disconnectedAt, undefined);

  // Old socket id should be gone from room
  const roomRejoined = rm.getRoom(code);
  assert.ok(roomRejoined);
  assert.strictEqual(roomRejoined.participants['socket1'], undefined, 'old socket.id cleaned');
  assert.ok(roomRejoined.participants['socket2'], 'new socket.id has participant');

  // Invalid token should fail
  const badRejoin = rm.reconnectParticipant(code, 'invalid-token', 'socket3');
  assert.ok(badRejoin.error, 'invalid token should error');

  // Stale participant cleanup
  const roomBefore = rm.getRoom(code);
  assert.ok(roomBefore);

  // Simulate 6 min offline (exceed grace period)
  const now6MinLater = Date.now() + (6 * 60 * 1000);
  const cleaned = rm.cleanupStaleParticipants(now6MinLater);
  assert.strictEqual(cleaned, 0, 'no stale participants yet (socket2 still connected)');

  // Disconnect socket2
  rm.handleDisconnect('socket2');
  const cleaned2 = rm.cleanupStaleParticipants(now6MinLater);
  assert.strictEqual(cleaned2, 1, 'stale participant removed after 6 min offline');

  const roomFinal = rm.getRoom(code);
  assert.ok(roomFinal);
  assert.strictEqual(Object.keys(roomFinal.participants).length, 0, 'all participants cleaned');

  console.log('✅ test-reconnect: All assertions passed!');
})();
