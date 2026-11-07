import { PluginManifest } from './index';

export interface BuiltinPlugin {
  manifest: PluginManifest;
  html: string;
}

const IX_SDK_BOOTSTRAP = `
<script>
window.ix = {
  _handlers: [],
  _initHandlers: [],
  ctx: null,
  onInit(cb) { 
    if (this.ctx) cb(this.ctx);
    else this._initHandlers.push(cb); 
  },
  onMessage(cb) { this._handlers.push(cb); },
  send(msg) { window.parent.postMessage({ type: 'ix:send', msg }, '*'); },
  broadcast(msg) { window.parent.postMessage({ type: 'ix:broadcast', msg }, '*'); },
  sendTo(targetId, msg) { window.parent.postMessage({ type: 'ix:sendTo', targetId, msg }, '*'); },
  submitScore(points, meta) { window.parent.postMessage({ type: 'ix:submitScore', points, meta }, '*'); },
  end(result) { window.parent.postMessage({ type: 'ix:end', result }, '*'); }
};
window.addEventListener('message', (e) => {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'ix:init') {
    window.ix.ctx = e.data.ctx;
    window.ix._initHandlers.forEach(h => h(e.data.ctx));
  } else if (e.data.type === 'ix:message') {
    window.ix._handlers.forEach(h => h(e.data.msg));
  }
});
</script>
`;

export const BUILTIN_PLUGINS: BuiltinPlugin[] = [
  {
    manifest: {
      id: 'tebak-cepat',
      name: 'Tebak Cepat (Reaction Test)',
      version: '1.0.0',
      author: 'Inixindo EduTech',
      description: 'Game adu kecepatan reaksi sentuh saat layar berubah warna hijau.',
      views: ['presenter', 'participant'],
      participants: { min: 1, max: 200 },
      scoring: { mode: 'points', maxPointsPerRound: 100 },
      config: {
        rounds: { type: 'integer', default: 3, min: 1, max: 10 }
      }
    },
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tebak Cepat</title>
${IX_SDK_BOOTSTRAP}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; text-align: center; }
  .btn { background: #3b82f6; color: #fff; border: 0; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; }
  .btn:hover { background: #2563eb; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
  .arena { width: 100%; height: 260px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; margin: 16px 0; user-select: none; transition: background 0.15s; }
  .ready { background: #eab308; color: #000; }
  .go { background: #22c55e; color: #fff; cursor: pointer; transform: scale(1.02); }
  .too-early { background: #ef4444; color: #fff; }
  .done { background: #334155; color: #94a3b8; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; text-align: left; }
  th, td { padding: 8px 12px; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
</style>
</head>
<body>
<div class="card" id="app">
  <h2 id="title" style="margin-bottom: 8px;">Tebak Cepat</h2>
  <p id="sub" style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">Memuat game...</p>
  <div id="content"></div>
</div>

<script>
let role = 'participant';
let results = [];
let currentRound = 0;
let totalRounds = 3;
let startTime = 0;
let waitingForGreen = false;
let canClick = false;

window.ix.onInit((ctx) => {
  role = ctx.role;
  totalRounds = ctx.config?.rounds || 3;
  
  if (role === 'presenter') {
    renderPresenter();
  } else {
    renderParticipant();
  }
});

function renderPresenter() {
  document.getElementById('title').textContent = '⚡ Tebak Cepat - Arena Presenter';
  document.getElementById('sub').textContent = 'Ronde ' + currentRound + ' dari ' + totalRounds;
  
  const content = document.getElementById('content');
  content.innerHTML = \`
    <button class="btn" id="startBtn" onclick="startRound()">Mulai Ronde Baru</button>
    <div style="margin-top: 16px; max-height: 200px; overflow-y: auto;">
      <table>
        <thead>
          <tr><th>Peserta</th><th>Waktu</th><th>Poin</th></tr>
        </thead>
        <tbody id="leaderboardBody">
          \${results.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#64748b;">Belum ada respons</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  \`;
}

function startRound() {
  currentRound++;
  document.getElementById('sub').textContent = 'Ronde ' + currentRound + ' dari ' + totalRounds;
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = true;

  window.ix.broadcast({ type: 'start_round', round: currentRound });
  
  // Random delay between 2s and 5s
  const delay = Math.floor(Math.random() * 3000) + 2000;
  setTimeout(() => {
    window.ix.broadcast({ type: 'go_now', startTime: Date.now() });
    if (startBtn) startBtn.disabled = false;
  }, delay);
}

window.ix.onMessage((msg) => {
  if (role === 'presenter' && msg.type === 'participant_reaction') {
    results.push(msg);
    results.sort((a, b) => a.reactionMs - b.reactionMs);
    const tbody = document.getElementById('leaderboardBody');
    if (tbody) {
      tbody.innerHTML = results.map((r, i) => \`
        <tr>
          <td>\${i === 0 ? '👑 ' : ''}\${r.name}</td>
          <td style="font-family:monospace; color:#38bdf8;">\${r.reactionMs} ms</td>
          <td style="color:#facc15; font-weight:bold;">+\${r.points} ⭐</td>
        </tr>
      \`).join('');
    }
  } else if (role === 'participant') {
    if (msg.type === 'start_round') {
      waitingForGreen = true;
      canClick = true;
      showParticipantArena('ready', 'SIAP-SIAP...', 'Tunggu layar menjadi HIJAU!');
    } else if (msg.type === 'go_now') {
      startTime = msg.startTime || Date.now();
      waitingForGreen = false;
      showParticipantArena('go', 'KLIK SEKARANG!', 'SENTUH SECEPATNYA!');
    }
  }
});

function renderParticipant() {
  document.getElementById('title').textContent = '⚡ Tebak Cepat';
  document.getElementById('sub').textContent = 'Tunggu presenter memulai ronde...';
  const content = document.getElementById('content');
  content.innerHTML = \`<div class="arena done" id="arenaBox">Menunggu host...</div>\`;
}

function showParticipantArena(statusClass, bigText, desc) {
  const box = document.getElementById('arenaBox');
  if (!box) return;
  box.className = 'arena ' + statusClass;
  box.innerHTML = \`<span>\${bigText}</span><span style="font-size:14px; font-weight:normal; margin-top:8px;">\${desc}</span>\`;
  box.onclick = handleParticipantClick;
}

function handleParticipantClick() {
  if (!canClick) return;
  
  if (waitingForGreen) {
    // Clicked too early
    canClick = false;
    showParticipantArena('too-early', 'TERLALU CEPAT!', 'Tunggu warna hijau berikutnya.');
    window.ix.send({ type: 'participant_reaction', name: window.ix.ctx?.participant?.displayName || 'Peserta', reactionMs: 9999, points: 0 });
    return;
  }
  
  // Clicked on green!
  canClick = false;
  const reactionMs = Date.now() - startTime;
  const points = Math.max(10, Math.min(100, Math.round(100 - (reactionMs / 25))));
  showParticipantArena('done', reactionMs + ' ms!', 'Luar biasa! Skor: +' + points + ' poin');
  
  // Send result to presenter
  window.ix.send({ 
    type: 'participant_reaction', 
    name: window.ix.ctx?.participant?.displayName || 'Peserta', 
    reactionMs, 
    points 
  });
  
  // Submit score to InixPoint system
  window.ix.submitScore(points, { reactionMs });
}
</script>
</body>
</html>`
  },
  {
    manifest: {
      id: 'clicker-battle',
      name: 'Tap Frenzy (Adu Klik Cepat)',
      version: '1.0.0',
      author: 'Inixindo EduTech',
      description: 'Game adu jumlah klik sebanyak-banyaknya dalam batas waktu 10 detik.',
      views: ['presenter', 'participant'],
      participants: { min: 1, max: 200 },
      scoring: { mode: 'points', maxPointsPerRound: 100 },
      config: {
        durationSec: { type: 'integer', default: 10, min: 5, max: 30 }
      }
    },
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tap Frenzy</title>
${IX_SDK_BOOTSTRAP}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: #0b0f19; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; text-align: center; }
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 24px; max-width: 480px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .btn { background: #ec4899; color: #fff; border: 0; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.15s; }
  .btn:hover { background: #db2777; }
  .tap-btn { width: 180px; height: 180px; border-radius: 50%; background: linear-gradient(135deg, #f43f5e, #be123c); color: white; font-size: 26px; font-weight: 900; border: 6px solid #fb7185; cursor: pointer; margin: 24px auto; box-shadow: 0 0 35px rgba(244,63,94,0.5); transition: transform 0.05s; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none; }
  .tap-btn:active { transform: scale(0.92); }
  .counter { font-size: 48px; font-weight: 900; font-family: monospace; color: #fb7185; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; text-align: left; }
  th, td { padding: 8px 12px; border-bottom: 1px solid #1f2937; }
</style>
</head>
<body>
<div class="card" id="app">
  <h2 id="title" style="margin-bottom: 6px;">🔥 Tap Frenzy</h2>
  <p id="sub" style="color: #9ca3af; font-size: 14px;">Memuat game...</p>
  <div id="content"></div>
</div>

<script>
let role = 'participant';
let duration = 10;
let clicks = 0;
let timeLeft = 10;
let timer = null;
let active = false;
let scores = {};

window.ix.onInit((ctx) => {
  role = ctx.role;
  duration = ctx.config?.durationSec || 10;
  timeLeft = duration;
  
  if (role === 'presenter') {
    renderPresenter();
  } else {
    renderParticipant();
  }
});

function renderPresenter() {
  document.getElementById('title').textContent = '🔥 Tap Frenzy - Live Battle';
  document.getElementById('sub').textContent = 'Durasi: ' + duration + ' Detik';
  const content = document.getElementById('content');
  content.innerHTML = \`
    <button class="btn" id="startBattleBtn" onclick="startBattle()">Mulai Battle (\${duration}s)</button>
    <div id="timerDisplay" style="font-size: 36px; font-weight: 900; color: #f43f5e; margin: 16px 0; display: none;">\${duration}s</div>
    <table>
      <thead>
        <tr><th>Peringkat</th><th>Nama</th><th>Total Klik</th><th>Poin</th></tr>
      </thead>
      <tbody id="scoresBody">
        <tr><td colspan="4" style="text-align:center; color:#6b7280;">Tekan mulai untuk bertanding!</td></tr>
      </tbody>
    </table>
  \`;
}

function startBattle() {
  const btn = document.getElementById('startBattleBtn');
  if (btn) btn.disabled = true;
  const tDisp = document.getElementById('timerDisplay');
  if (tDisp) { tDisp.style.display = 'block'; tDisp.textContent = duration + 's'; }

  scores = {};
  window.ix.broadcast({ type: 'battle_start', duration });
  
  timeLeft = duration;
  timer = setInterval(() => {
    timeLeft--;
    if (tDisp) tDisp.textContent = timeLeft + 's';
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (tDisp) tDisp.textContent = 'SELESAI!';
      if (btn) btn.disabled = false;
      window.ix.broadcast({ type: 'battle_over' });
      window.ix.end({ winner: getTopWinner() });
    }
  }, 1000);
}

function getTopWinner() {
  const list = Object.values(scores).sort((a,b) => b.clicks - a.clicks);
  return list[0]?.name || 'Tidak ada';
}

window.ix.onMessage((msg) => {
  if (role === 'presenter' && msg.type === 'click_update') {
    scores[msg.senderId] = msg;
    updateLeaderboard();
  } else if (role === 'participant') {
    if (msg.type === 'battle_start') {
      clicks = 0;
      active = true;
      document.getElementById('clickCounter').textContent = '0';
      document.getElementById('sub').textContent = 'TAP SEBANYAK MUNGKIN!';
      const tap = document.getElementById('tapBtn');
      if (tap) tap.style.pointerEvents = 'auto';
    } else if (msg.type === 'battle_over') {
      active = false;
      document.getElementById('sub').textContent = 'WAKTU HABIS! Skor Terkirim.';
      const tap = document.getElementById('tapBtn');
      if (tap) tap.style.pointerEvents = 'none';
      const points = Math.min(100, Math.round(clicks * 2.5));
      window.ix.submitScore(points, { totalClicks: clicks });
    }
  }
});

function updateLeaderboard() {
  const tbody = document.getElementById('scoresBody');
  if (!tbody) return;
  const list = Object.values(scores).sort((a,b) => b.clicks - a.clicks);
  tbody.innerHTML = list.map((item, idx) => \`
    <tr>
      <td>\${idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}#\${idx + 1}</td>
      <td style="font-weight:bold;">\${item.name}</td>
      <td style="font-family:monospace; color:#f43f5e; font-weight:bold;">\${item.clicks}</td>
      <td style="color:#facc15;">+\${Math.min(100, Math.round(item.clicks * 2.5))} ⭐</td>
    </tr>
  \`).join('');
}

function renderParticipant() {
  document.getElementById('title').textContent = '🔥 Tap Frenzy';
  document.getElementById('sub').textContent = 'Tunggu presenter memulai adu klik!';
  const content = document.getElementById('content');
  content.innerHTML = \`
    <div class="counter" id="clickCounter">0</div>
    <button class="tap-btn" id="tapBtn" style="pointer-events: none;" onclick="handleClick()">
      <span>TAP!</span>
      <span style="font-size: 13px; font-weight: normal; opacity: 0.8;">Ketuk cepat</span>
    </button>
  \`;
}

function handleClick() {
  if (!active) return;
  clicks++;
  document.getElementById('clickCounter').textContent = String(clicks);
  window.ix.send({ 
    type: 'click_update', 
    senderId: window.ix.ctx?.participant?.sessionId || 'self',
    name: window.ix.ctx?.participant?.displayName || 'Peserta', 
    clicks 
  });
}
</script>
</body>
</html>`
  }
];
