const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { networkInterfaces } = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration par défaut - gardée identique au HTML original
const DEFAULT_MIXES = [
  { id:'tropical', emoji:'🥭', name:'Mix Tropical', alc:false, stock:8,
    combos:[
      { name:'Tropi-Kat 🐱', recipe:'Mix Tropical + 120ml tonic + glaçons', soft:'tonic', icon:'🫧' },
      { name:'L\'Ananas-rchiste', recipe:'Mix Tropical + 100ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍' },
      { name:'Mangue Ta Vie', recipe:'Mix Tropical + 100ml jus de mangue + glaçons', soft:'mangue', icon:'🥭' },
    ]},
  { id:'fresh', emoji:'🌿', name:'Mix Fresh', alc:false, stock:6,
    combos:[
      { name:'Virgin Mojito', recipe:'Mix Fresh + 120ml eau gazeuse + menthe fraîche + lime', soft:'gazeuse', icon:'🍃' },
      { name:'Fraîch\'Attitude', recipe:'Mix Fresh + 120ml tonic + glaçons', soft:'tonic', icon:'🫧' },
    ]},
  { id:'maitai', emoji:'🏝', name:'Mix Mai Tai', alc:true, stock:10,
    combos:[
      { name:'Mai Tai Classique', recipe:'Mix Mai Tai + 80ml jus d\'ananas + glaçons pilés', soft:'ananas', icon:'🍍' },
      { name:'Mai Oh Mai', recipe:'Mix Mai Tai + 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭' },
      { name:'Tai Piquant', recipe:'Mix Mai Tai + 100ml ginger beer + glaçons', soft:'ginger', icon:'🫚' },
    ]},
  { id:'passion', emoji:'🍑', name:'Mix Passion', alc:true, stock:10,
    combos:[
      { name:'Pornstar Martini', recipe:'Mix Passion + shot de prosecco à côté', soft:'prosecco', icon:'🥂' },
      { name:'Passionnément Orange', recipe:'Mix Passion + 80ml jus d\'orange + glaçons', soft:'orange', icon:'🍊' },
      { name:'Fruit Défendu', recipe:'Mix Passion + 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭' },
      { name:'Crush Fizz', recipe:'Mix Passion + 120ml tonic + glaçons', soft:'tonic', icon:'🫧' },
      { name:'Ananas Désir', recipe:'Mix Passion + 80ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍' },
    ]},
  { id:'ginger', emoji:'🫚', name:'Mix Ginger', alc:true, stock:8,
    combos:[
      { name:'Moscow Mule', recipe:'Mix Ginger + 120ml ginger beer + lime + glaçons', soft:'ginger', icon:'🫚' },
      { name:'Lever de Gingembre', recipe:'Mix Ginger + 80ml jus d\'orange + glaçons', soft:'orange', icon:'🌅' },
      { name:'Pique & Piquant', recipe:'Mix Ginger + 80ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍' },
    ]},
  { id:'sunset', emoji:'🍊', name:'Mix Sunset', alc:true, stock:12,
    combos:[
      { name:'Sunset de Fred', recipe:'Mix Sunset + 100ml jus d\'orange + glaçons', soft:'orange', icon:'🌅' },
      { name:'Soleil Couchant', recipe:'Mix Sunset + 100ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍' },
      { name:'Crépuscule Fizz', recipe:'Mix Sunset + 120ml tonic + glaçons', soft:'tonic', icon:'🫧' },
    ]},
  { id:'espresso', emoji:'☕', name:'Mix Espresso', alc:true, stock:10,
    combos:[
      { name:'Espresso Martini', recipe:'Mix Espresso + 30ml café froid + glaçons + shaker', soft:'cafe', icon:'☕' },
      { name:'Café Méca-Nick', recipe:'Mix Espresso + 80ml jus d\'orange + glaçons', soft:'orange', icon:'🍊' },
      { name:'Ginger Buzz', recipe:'Mix Espresso + 100ml ginger beer + glaçons', soft:'ginger', icon:'🫚' },
    ]},
];

const DEFAULT_SOFTS = [
  { id:'ginger', emoji:'🫚', name:'Ginger beer', stock:30 },
  { id:'orange', emoji:'🍊', name:'Jus orange', stock:30 },
  { id:'gazeuse', emoji:'💧', name:'Eau gazeuse', stock:20 },
  { id:'tonic', emoji:'🧊', name:'Tonic', stock:30 },
  { id:'ananas', emoji:'🍍', name:'Jus ananas', stock:30 },
  { id:'cafe', emoji:'☕', name:'Café froid', stock:10 },
  { id:'prosecco', emoji:'🥂', name:'Prosecco', stock:8 },
  { id:'mangue', emoji:'🥭', name:'Jus mangue', stock:20 },
];

// État global du serveur
let globalState = {
  mixes: JSON.parse(JSON.stringify(DEFAULT_MIXES)),
  softs: JSON.parse(JSON.stringify(DEFAULT_SOFTS)),
  stock: {}
};

// Chemin du fichier de sauvegarde
const STATE_FILE = path.join(__dirname, 'state.json');

// Charger l'état depuis le fichier
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (saved && saved.mixes && saved.softs && saved.stock) {
        globalState = saved;
        console.log('📂 État chargé depuis state.json');
        return;
      }
    }
  } catch (error) {
    console.log('⚠️  Erreur lecture state.json:', error.message);
  }
  
  // Init par défaut si pas de fichier valide
  console.log('🆕 Initialisation avec l\'état par défaut');
  globalState.stock.mixes = {};
  globalState.stock.softs = {};
  globalState.mixes.forEach(m => globalState.stock.mixes[m.id] = m.stock);
  globalState.softs.forEach(s => globalState.stock.softs[s.id] = s.stock);
  saveState();
}

// Sauvegarder l'état dans le fichier
function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(globalState, null, 2));
    console.log('💾 État sauvegardé');
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error.message);
  }
}

// Obtenir l'IP locale
function getLocalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Express - servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Route API pour récupérer l'état
app.get('/api/state', (req, res) => {
  res.json(globalState);
});

// Démarrer le serveur HTTP
const server = app.listen(PORT, () => {
  const localIP = getLocalIP();
  const url = `http://${localIP}:${PORT}`;
  
  console.log('🍹 Chez Fred - Serveur démarré !');
  console.log('');
  console.log(`📱 Accès local: http://localhost:${PORT}`);
  console.log(`🌐 Accès réseau: ${url}`);
  console.log('');
  console.log('📱 Scanner ce QR code avec ton téléphone :');
  qrcode.generate(url, { small: true });
  console.log('');
  console.log('💡 Assure-toi que tous les appareils sont sur le même WiFi !');
  console.log('🔧 Admin: maintenir appuyé sur le titre "Chez Fred"');
  console.log('');
});

// WebSocket Server
const wss = new WebSocket.Server({ server });
const clients = new Set();

// Broadcast à tous les clients connectés
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  console.log(`📡 Broadcast: ${message.type} → ${clients.size} client(s)`);
}

// Connexion WebSocket
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔗 Client connecté (${clients.size} total)`);
  
  // Envoyer l'état complet au nouveau client
  ws.send(JSON.stringify({
    type: 'sync',
    state: globalState
  }));
  
  // Gestion des messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Message reçu:', message.type);
      
      switch (message.type) {
        case 'serve':
          // Servir un cocktail
          if (globalState.stock.mixes[message.mixId] > 0 && 
              globalState.stock.softs[message.softId] > 0) {
            globalState.stock.mixes[message.mixId]--;
            globalState.stock.softs[message.softId]--;
            saveState();
            
            // Broadcast la nouvelle state à tous
            broadcast({
              type: 'sync',
              state: globalState
            });
            
            console.log(`🍹 Cocktail servi: ${message.mixId} + ${message.softId}`);
          }
          break;
          
        case 'admin_update':
          // Mise à jour depuis l'admin panel
          if (message.mixes) globalState.mixes = message.mixes;
          if (message.softs) globalState.softs = message.softs;
          if (message.stock) globalState.stock = message.stock;
          saveState();
          
          // Broadcast la mise à jour
          broadcast({
            type: 'sync',
            state: globalState
          });
          
          console.log('🔧 Mise à jour admin');
          break;
          
        case 'reset':
          // Reset complet
          globalState.mixes = JSON.parse(JSON.stringify(DEFAULT_MIXES));
          globalState.softs = JSON.parse(JSON.stringify(DEFAULT_SOFTS));
          globalState.stock = { mixes: {}, softs: {} };
          globalState.mixes.forEach(m => globalState.stock.mixes[m.id] = m.stock);
          globalState.softs.forEach(s => globalState.stock.softs[s.id] = s.stock);
          saveState();
          
          broadcast({
            type: 'sync',
            state: globalState
          });
          
          console.log('🔄 Reset effectué');
          break;
      }
      
    } catch (error) {
      console.error('❌ Erreur traitement message:', error.message);
    }
  });
  
  // Déconnexion
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`❌ Client déconnecté (${clients.size} restant)`);
  });
  
  ws.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error.message);
    clients.delete(ws);
  });
});

// Charger l'état au démarrage
loadState();

// Nettoyage à l'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  saveState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  saveState();
  process.exit(0);
});