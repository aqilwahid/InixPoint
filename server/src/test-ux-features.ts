import assert from 'node:assert';

console.log('Testing UX features logic (Timer +15s, Carousel Navigation bounds)...');

// 1. Timer format test
function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(75), '01:15');
assert.strictEqual(formatTime(75 + 15), '01:30'); // +15s check

// 2. Carousel circular bounds test
function nextIndex(current: number, total: number) {
  return current < total - 1 ? current + 1 : 0;
}
function prevIndex(current: number, total: number) {
  return current > 0 ? current - 1 : total - 1;
}

const totalResponses = 5;
assert.strictEqual(nextIndex(0, totalResponses), 1);
assert.strictEqual(nextIndex(4, totalResponses), 0); // circular wrap
assert.strictEqual(prevIndex(0, totalResponses), 4); // circular wrap
assert.strictEqual(prevIndex(2, totalResponses), 1);

console.log('All UX logic assertions passed! ✓');
