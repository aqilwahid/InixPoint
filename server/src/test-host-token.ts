import assert from 'node:assert';
import { RoomManager } from './roomManager.js';

// Self-check: host token auth (FR-2)
const rm = new RoomManager();
const room = rm.createRoom('Token Test', 'host_sock');
const token = rm.getHostToken(room.code);

assert(token && /^[0-9a-f]{32}$/.test(token), 'token 32 hex');
assert(rm.verifyHost(room.code, token), 'token benar diterima');
assert(!rm.verifyHost(room.code, 'x'.repeat(32)), 'token salah ditolak');
assert(!rm.verifyHost(room.code, ''), 'token kosong ditolak');
assert(!rm.verifyHost(room.code, undefined), 'token undefined ditolak');
assert(!rm.verifyHost(room.code, 123), 'token non-string ditolak');
assert(!rm.verifyHost('000000', token), 'room lain ditolak');
assert(!JSON.stringify(room).includes(token), 'token tidak bocor lewat Room');

const other = rm.createRoom('Other', 'host_2');
assert(!rm.verifyHost(other.code, token), 'token room A tidak berlaku di room B');

console.log('✅ test-host-token: All assertions passed!');
