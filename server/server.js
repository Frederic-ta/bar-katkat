const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { networkInterfaces } = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');

// ===== WIFI CONFIG =====
// Remplis ces valeurs avec ton WiFi de soirée !
const WIFI_SSID = process.env.WIFI_SSID || '';
const WIFI_PASS = process.env.WIFI_PASS || '';
const WIFI_TYPE = process.env.WIFI_TYPE || 'WPA'; // WPA, WEP, ou nopass

// ===== STATE =====
let globalState = { stock: {}, history: [], connectedUsers: [] };

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      globalState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log('📂 État chargé depuis state.json');
    }
  } catch (e) { console.error('❌ Erreur chargement état:', e.message); }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(globalState, null, 2));
  } catch (e) { console.error('❌ Erreur sauvegarde:', e.message); }
}

// ===== NETWORK =====
function getLocalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ===== EXPRESS =====
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/state', (req, res) => res.json(globalState));

// Page d'accueil avec QR codes (WiFi + Bar) — affichable sur écran/imprimable
const QRCode = require('qrcode');
app.get('/welcome', async (req, res) => {
  const localIP = getLocalIP();
  const barUrl = `http://${localIP}:${PORT}`;
  const barQR = await QRCode.toDataURL(barUrl, { width: 300, margin: 2 });

  let wifiQR = '';
  let wifiBlock = '';
  if (WIFI_SSID) {
    const wifiString = `WIFI:T:${WIFI_TYPE};S:${WIFI_SSID};P:${WIFI_PASS};;`;
    wifiQR = await QRCode.toDataURL(wifiString, { width: 300, margin: 2 });
    wifiBlock = `
      <div class="qr-card">
        <div class="qr-step">1</div>
        <h2>📶 Connecte-toi au WiFi</h2>
        <img src="${wifiQR}" alt="WiFi QR" />
        <p class="ssid">${WIFI_SSID}</p>
        <p class="hint">Scanne → connexion auto</p>
      </div>`;
  }

  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🍹 Sip Happens at Fred's</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#eee;font-family:'Segoe UI',system-ui,sans-serif;
  min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:30px}
h1{font-size:2em;text-align:center}
h1 small{display:block;font-size:.4em;color:#aaa;margin-top:4px}
.qr-cards{display:flex;gap:30px;flex-wrap:wrap;justify-content:center}
.qr-card{background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);
  border-radius:24px;padding:30px;text-align:center;min-width:280px;position:relative}
.qr-card h2{font-size:1.1em;margin-bottom:16px;color:#ddd}
.qr-card img{border-radius:16px;width:250px;height:250px}
.qr-step{position:absolute;top:-12px;left:50%;transform:translateX(-50%);
  background:#e94560;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:.85em}
.ssid{font-size:1.2em;font-weight:700;margin-top:12px;color:#4ecca3}
.hint{color:#aaa;font-size:.8em;margin-top:6px}
.url{font-family:monospace;font-size:.9em;color:#f0a500;margin-top:8px}
</style></head><body>
<h1>🍹 Sip Happens at Fred's<small>5 avril 2026</small></h1>
<div class="qr-cards">
  ${wifiBlock}
  <div class="qr-card">
    <div class="qr-step">${WIFI_SSID ? '2' : '1'}</div>
    <h2>🍹 Ouvre le bar</h2>
    <img src="${barQR}" alt="Bar QR" />
    <p class="url">${barUrl}</p>
    <p class="hint">Scanne → choisis ton cocktail</p>
  </div>
</div>
</body></html>`);
});

// Dashboard live — classement + historique temps réel
app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🍹 Dashboard — Sip Happens</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#eee;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;padding:20px}
h1{text-align:center;font-size:1.8em;margin-bottom:4px}
h1 small{display:block;font-size:.4em;color:#aaa;font-weight:400}
.container{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1200px;margin:20px auto}
@media(max-width:768px){.container{grid-template-columns:1fr}}
.panel{background:rgba(255,255,255,.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);
  border-radius:20px;padding:20px;max-height:85vh;overflow-y:auto}
.panel h2{font-size:1.1em;margin-bottom:14px;color:#aaa;text-transform:uppercase;letter-spacing:1px;font-size:.8em}
.rank{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;margin-bottom:6px;
  background:rgba(255,255,255,.03);transition:all .3s}
.rank:first-child{background:rgba(233,69,96,.1)}
.rank-pos{font-size:1.4em;font-weight:800;width:36px;text-align:center;flex-shrink:0}
.rank:first-child .rank-pos{color:#e94560}
.rank:nth-child(2) .rank-pos{color:#f0a500}
.rank:nth-child(3) .rank-pos{color:#4ecca3}
.rank-name{font-weight:600;flex:1}
.rank-score{font-size:1.2em;font-weight:700;color:#4ecca3}
.rank-drinks{font-size:.75em;color:#aaa;margin-top:2px}
.event{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;margin-bottom:6px;
  background:rgba(255,255,255,.03);animation:fadeIn .4s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.event-time{font-size:.75em;color:#aaa;width:50px;flex-shrink:0;text-align:center}
.event-icon{font-size:1.4em;flex-shrink:0}
.event-text{flex:1}
.event-name{font-weight:600}
.event-drink{color:#aaa;font-size:.85em}
.stats{display:flex;gap:12px;justify-content:center;margin:16px 0;flex-wrap:wrap}
.stat{background:rgba(255,255,255,.04);border-radius:14px;padding:10px 18px;text-align:center}
.stat-val{font-size:1.6em;font-weight:800}
.stat-label{font-size:.7em;color:#aaa;text-transform:uppercase;letter-spacing:.5px}
.live-dot{display:inline-block;width:8px;height:8px;background:#4ecca3;border-radius:50%;
  animation:pulse 2s infinite;margin-right:6px;vertical-align:middle}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.empty{color:#555;text-align:center;padding:40px;font-style:italic}
</style></head><body>
<h1>🍹 Sip Happens at Fred's<small><span class="live-dot"></span>Dashboard Live</small></h1>

<div class="stats" id="stats"></div>

<div class="container">
  <div class="panel" id="ranking-panel">
    <h2>🏆 Classement</h2>
    <div id="ranking" class="empty">En attente des premiers drinks...</div>
  </div>
  <div class="panel" id="history-panel">
    <h2>📜 Historique</h2>
    <div id="history" class="empty">Aucune commande pour l'instant...</div>
  </div>
</div>

<script>
const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
let ws;
let state = {};

function connect() {
  ws = new WebSocket(proto + '//' + location.host);
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'sync' && msg.state) { state = msg.state; render(); }
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connect, 2000);
  ws.onerror = () => ws.close();
}

function render() {
  const history = state.history || [];

  // Stats
  const totalDrinks = history.length;
  const uniqueUsers = [...new Set(history.map(h => h.username))].length;
  const topDrink = mostCommon(history.map(h => h.cocktailName));
  document.getElementById('stats').innerHTML =
    '<div class="stat"><div class="stat-val">' + totalDrinks + '</div><div class="stat-label">Drinks servis</div></div>' +
    '<div class="stat"><div class="stat-val">' + uniqueUsers + '</div><div class="stat-label">Participants</div></div>' +
    (topDrink ? '<div class="stat"><div class="stat-val">' + topDrink + '</div><div class="stat-label">Best seller</div></div>' : '');

  // Ranking
  const scores = {};
  history.forEach(h => {
    if (!h.username) return;
    if (!scores[h.username]) scores[h.username] = { drinks: 0, items: [] };
    scores[h.username].drinks++;
    scores[h.username].items.push(h.cocktailName);
  });
  const ranked = Object.entries(scores).sort((a,b) => b[1].drinks - a[1].drinks);

  if (ranked.length === 0) {
    document.getElementById('ranking').innerHTML = '<div class="empty">En attente des premiers drinks...</div>';
  } else {
    document.getElementById('ranking').innerHTML = ranked.map(([name, data], i) => {
      const medals = ['👑','🥈','🥉'];
      const pos = i < 3 ? medals[i] : (i+1);
      const unique = [...new Set(data.items)];
      return '<div class="rank"><div class="rank-pos">' + pos + '</div>' +
        '<div><div class="rank-name">' + name + '</div>' +
        '<div class="rank-drinks">' + unique.join(', ') + '</div></div>' +
        '<div class="rank-score">' + data.drinks + ' 🍹</div></div>';
    }).join('');
  }

  // History
  if (history.length === 0) {
    document.getElementById('history').innerHTML = '<div class="empty">Aucune commande pour l\\'instant...</div>';
  } else {
    document.getElementById('history').innerHTML = history.slice(0, 50).map(h => {
      const d = new Date(h.timestamp);
      const time = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      const icon = h.mixName === 'Soft' ? '🥤' : h.mixName === 'Bière' ? '🍺' : '🍹';
      return '<div class="event"><div class="event-time">' + time + '</div>' +
        '<div class="event-icon">' + icon + '</div>' +
        '<div class="event-text"><div class="event-name">' + (h.username||'???') + '</div>' +
        '<div class="event-drink">' + (h.cocktailName||'') + '</div></div></div>';
    }).join('');
  }
}

function mostCommon(arr) {
  const counts = {};
  arr.forEach(x => { if(x) counts[x] = (counts[x]||0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

connect();
setInterval(() => { if (ws.readyState !== WebSocket.OPEN) connect(); }, 5000);
</script>
</body></html>`);
});

// ===== HTTP SERVER =====
const server = app.listen(PORT, () => {
  const localIP = getLocalIP();
  const url = `http://${localIP}:${PORT}`;
  console.log('');
  console.log('🍹 Sip Happens at Fred\'s — Serveur temps réel');
  console.log('');
  console.log(`📱 Local:  http://localhost:${PORT}`);
  console.log(`🌐 Réseau: ${url}`);
  console.log('');

  // QR WiFi (si configuré)
  if (WIFI_SSID) {
    const wifiString = `WIFI:T:${WIFI_TYPE};S:${WIFI_SSID};P:${WIFI_PASS};;`;
    console.log(`📶 WiFi : ${WIFI_SSID}`);
    console.log('   Scanne ce QR pour se connecter au WiFi :');
    qrcode.generate(wifiString, { small: true });
    console.log('');
  } else {
    console.log('💡 Astuce : lance avec WIFI_SSID et WIFI_PASS pour un QR WiFi auto');
    console.log('   Exemple : WIFI_SSID="MonWifi" WIFI_PASS="motdepasse" node server.js');
    console.log('');
  }

  // QR Bar
  console.log('🍹 QR Code du bar :');
  qrcode.generate(url, { small: true });
  console.log('');
  console.log(`👥 Connectés: 0`);
  console.log('');
});

// ===== WEBSOCKET =====
const wss = new WebSocket.Server({ server });
const clients = new Set();
const clientUsernames = new Map();

function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  clients.forEach(c => {
    if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(data);
  });
}

function broadcastUserCount() {
  broadcast({ type: 'users', count: clients.size, usernames: [...clientUsernames.values()] });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔗 +1 client (${clients.size} connectés)`);
  broadcastUserCount();

  // Envoyer l'état complet au nouveau client
  ws.send(JSON.stringify({ type: 'sync', state: globalState }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'register':
          if (msg.username) {
            clientUsernames.set(ws, msg.username);
            broadcastUserCount();
            console.log(`👤 ${msg.username} enregistré`);
          }
          break;

        case 'stock_update':
          // Client envoie le delta de stock après un service
          if (msg.stock) globalState.stock = msg.stock;
          if (msg.historyEntry) {
            if (!globalState.history) globalState.history = [];
            globalState.history.unshift(msg.historyEntry);
            if (globalState.history.length > 200) globalState.history = globalState.history.slice(0, 200);
          }
          saveState();
          // Broadcast à tous les AUTRES clients
          broadcast({ type: 'sync', state: globalState }, ws);
          const who = msg.historyEntry?.username || '?';
          const what = msg.historyEntry?.cocktailName || '?';
          console.log(`🍹 ${who} → ${what}`);
          break;

        case 'full_sync':
          // Admin push — full state override
          if (msg.state) {
            globalState = msg.state;
            saveState();
            broadcast({ type: 'sync', state: globalState }, ws);
            console.log('🔧 Sync admin');
          }
          break;

        case 'reset':
          globalState = { stock: {}, history: [], connectedUsers: [] };
          saveState();
          broadcast({ type: 'reset' });
          console.log('🔄 Reset complet');
          break;
      }
    } catch (e) { console.error('❌ Message invalide:', e.message); }
  });

  ws.on('close', () => {
    clients.delete(ws);
    const username = clientUsernames.get(ws);
    clientUsernames.delete(ws);
    broadcastUserCount();
    console.log(`❌ ${username || 'Anonyme'} déconnecté (${clients.size} restants)`);
  });

  ws.on('error', (e) => {
    clients.delete(ws);
    clientUsernames.delete(ws);
    console.error('❌ WS error:', e.message);
  });
});

loadState();

process.on('SIGINT', () => { console.log('\n🛑 Arrêt...'); saveState(); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Arrêt...'); saveState(); process.exit(0); });
