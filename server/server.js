const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { networkInterfaces } = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');

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
  console.log('📱 QR Code pour tes invités :');
  qrcode.generate(url, { small: true });
  console.log('');
  console.log('💡 Tout le monde doit être sur le même WiFi !');
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
