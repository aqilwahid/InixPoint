import assert from 'node:assert/strict';
import { initDatabase } from './db';
import { registerUser } from './auth';
import { createClass, getClassesByOwner, getClassById, updateClass, deleteClass } from './classes';

async function main() {
  initDatabase();
  const stamp = Date.now();
  const a = await registerUser(`a${stamp}@t.com`, 'password123', 'A');
  const b = await registerUser(`b${stamp}@t.com`, 'password123', 'B');
  assert(a.user && b.user);

  const c = createClass(a.user.id, 'Kelas 1', 'desc');
  assert.equal(getClassesByOwner(a.user.id).length, 1);
  assert.equal(getClassById(c.id, a.user.id)?.name, 'Kelas 1');

  // owner isolation
  assert.equal(getClassById(c.id, b.user.id), null);
  assert.equal(updateClass(c.id, b.user.id, { name: 'hack' }), null);
  assert.equal(deleteClass(c.id, b.user.id), false);

  assert.equal(updateClass(c.id, a.user.id, { name: 'Kelas 2' })?.name, 'Kelas 2');
  assert.equal(deleteClass(c.id, a.user.id), true);
  assert.equal(getClassesByOwner(a.user.id).length, 0);

  console.log('✅ test-classes: all assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
