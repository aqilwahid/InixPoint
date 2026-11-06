import { io as ioClient } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const NUM_PARTICIPANTS = parseInt(process.env.LOAD_TEST_PARTICIPANTS || '200');
const DURATION_SEC = parseInt(process.env.LOAD_TEST_DURATION_SEC || '30');

console.log(`[Load Test] Starting: ${NUM_PARTICIPANTS} participants, ${DURATION_SEC}s duration`);

const metrics = {
  joinCount: 0,
  joinErrors: 0,
  answerCount: 0,
  answerErrors: 0,
  latencies: [] as number[]
};

(async () => {
  // Create room first
  const hostSocket = ioClient(SERVER_URL);
  let roomCode = '';
  let hostToken = '';

  await new Promise(resolve => {
    hostSocket.on('connect', () => {
      hostSocket.emit('create-room', { title: 'Load Test' }, (res: any) => {
        if (res.success) {
          roomCode = res.room.code;
          hostToken = res.hostToken;
          console.log(`[Load Test] Room created: ${roomCode}`);
          resolve(null);
        }
      });
    });
  });

  // Start question
  const questionPayload = {
    type: 'multiple_choice',
    prompt: 'Load test question?',
    timeLimitSec: DURATION_SEC,
    options: { choices: ['A', 'B', 'C', 'D'], correctIndex: 0, hasCorrectAnswer: true }
  };
  hostSocket.emit('start-question', { code: roomCode, hostToken, question: questionPayload });

  // Spawn participants
  const sockets: any[] = [];
  const joinStartMs = Date.now();

  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const socket = ioClient(SERVER_URL);
    sockets.push(socket);

    socket.on('connect', () => {
      const joinStartMs = Date.now();
      socket.emit('join-room', { code: roomCode, name: `P${i}` }, (res: any) => {
        const latency = Date.now() - joinStartMs;
        if (res.success) {
          metrics.joinCount++;
          metrics.latencies.push(latency);
        } else {
          metrics.joinErrors++;
        }
      });
    });

    socket.on('question-started', (q: any) => {
      const answerStartMs = Date.now();
      socket.emit('submit-answer', {
        code: roomCode,
        questionId: q.id,
        content: Math.floor(Math.random() * 4).toString()
      }, (res: any) => {
        const latency = Date.now() - answerStartMs;
        if (res.success) {
          metrics.answerCount++;
          metrics.latencies.push(latency);
        } else {
          metrics.answerErrors++;
        }
      });
    });
  }

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, DURATION_SEC * 1000));

  // Collect stats
  const latencySorted = metrics.latencies.sort((a, b) => a - b);
  const p50 = latencySorted[Math.floor(latencySorted.length * 0.5)];
  const p95 = latencySorted[Math.floor(latencySorted.length * 0.95)];
  const p99 = latencySorted[Math.floor(latencySorted.length * 0.99)];
  const avg = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;

  console.log(`[Load Test Results]
  Joins: ${metrics.joinCount} success, ${metrics.joinErrors} errors
  Answers: ${metrics.answerCount} success, ${metrics.answerErrors} errors
  Latency (ms):
    - Average: ${avg.toFixed(2)}
    - p50: ${p50}
    - p95: ${p95}
    - p99: ${p99}
  Error Rate: ${((metrics.joinErrors + metrics.answerErrors) / (metrics.joinCount + metrics.answerCount) * 100).toFixed(2)}%
  `);

  sockets.forEach(s => s.disconnect());
  hostSocket.disconnect();
  process.exit(0);
})();
