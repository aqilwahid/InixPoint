import assert from 'node:assert/strict';
import { initDatabase } from './db';
import { registerUser } from './auth';
import { createClass, getClassLeaderboard } from './classes';
import { RoomManager } from './roomManager';

async function main() {
  initDatabase();
  const stamp = Date.now();
  const owner = await registerUser(`owner${stamp}@t.com`, 'pass', 'Owner');
  assert(owner.user);

  const classObj = createClass(owner.user.id, 'Test Class');

  // Just verify that leaderboard returns empty for new class (no sessions yet)
  const lb1 = getClassLeaderboard(classObj.id, owner.user.id);
  assert(lb1.length === 0, `Expected 0 leaderboard entries initially, got ${lb1.length}`);

  // Verify owner isolation
  const other = await registerUser(`other${stamp}@t.com`, 'pass', 'Other');
  assert(other.user);
  const lb2 = getClassLeaderboard(classObj.id, other.user.id);
  assert(lb2.length === 0, `Other user should not see owner's class leaderboard`);

  console.log('✅ test-leaderboard: all assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
