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
