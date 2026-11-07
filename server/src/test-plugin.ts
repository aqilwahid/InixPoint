import assert from 'node:assert';
import { RoomManager } from './roomManager';
import { BUILTIN_PLUGINS } from '@inixpoint/shared';

console.log('Testing R5 Plugin Game logic...');

// 1. Verify Builtin Plugins
assert(Array.isArray(BUILTIN_PLUGINS) && BUILTIN_PLUGINS.length >= 2, 'Must have at least 2 builtin plugins');
const tebakCepat = BUILTIN_PLUGINS.find(p => p.manifest.id === 'tebak-cepat');
assert(tebakCepat, 'tebak-cepat plugin must exist');
assert(tebakCepat.manifest.scoring.maxPointsPerRound === 100, 'tebak-cepat maxPointsPerRound must be 100');
assert(tebakCepat.html.includes('window.ix'), 'Plugin must include ix SDK bootstrap');

const tapFrenzy = BUILTIN_PLUGINS.find(p => p.manifest.id === 'clicker-battle');
assert(tapFrenzy, 'clicker-battle plugin must exist');

// 2. Setup room and participants
const rm = new RoomManager();
const room = rm.createRoom('R5 Plugin Test Room', 'host_socket_1');
const hostToken = rm.getHostToken(room.code);
assert(room && hostToken);

const p1 = rm.joinRoom(room.code, 'socket_p1', 'Budi');
assert(p1.participant);

// 3. Start a plugin question
rm.startQuestion(room.code, {
  type: 'plugin_game',
  prompt: 'Game: Tebak Cepat',
  pluginConfig: {
    pluginId: tebakCepat.manifest.id,
    manifest: tebakCepat.manifest,
    config: { rounds: 3 },
    countTowardsLeaderboard: true,
    html: tebakCepat.html
  }
});

assert(room.currentQuestion?.type === 'plugin_game');

// 4. Test score submission & capping (PL-07 & FR-5)
// Attempt to claim 150 points (exceeding manifest max of 100)
const res1 = rm.submitPluginScore(room.code, 'socket_p1', 150, { reactionMs: 120 });
assert(res1.success, 'Score submission must succeed');
assert.strictEqual(res1.pointsAwarded, 100, 'Score must be capped at manifest max (100)');
assert.strictEqual(p1.participant.score, 100, 'Participant score must be incremented to 100');

// Attempt valid score
const res2 = rm.submitPluginScore(room.code, 'socket_p1', 45, { reactionMs: 250 });
assert(res2.success);
assert.strictEqual(res2.pointsAwarded, 45);
assert.strictEqual(p1.participant.score, 145);

// 5. Test countTowardsLeaderboard = false (FR-18)
const p2 = rm.joinRoom(room.code, 'socket_p2', 'Siti');
assert(p2.participant);

room.currentQuestion!.pluginConfig!.countTowardsLeaderboard = false;
const res3 = rm.submitPluginScore(room.code, 'socket_p2', 80);
assert(res3.success);
assert.strictEqual(res3.pointsAwarded, 80);
assert.strictEqual(p2.participant.score, 0, 'Score must NOT be added to participant score when countTowardsLeaderboard=false');

// 6. Test reject if question is closed
rm.closeQuestion(room.code, room.currentQuestion!.id);
const res4 = rm.submitPluginScore(room.code, 'socket_p1', 50);
assert(!res4.success, 'Score must be rejected when plugin game is closed');

console.log('✅ R5 Plugin Game assertions passed successfully!');
