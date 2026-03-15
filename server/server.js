const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { networkInterfaces } = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration par défaut - synchronisée avec la version principale
const DEFAULT_MIXES = [
  { id:'tropical', emoji:'🥭', name:'Mix Tropical', alc:false, stock:8,
    combos:[
      { name:'Tropi-Kat 🐱', recipe:'🥭 Mix Tropical (fiole) : 75ml sirop mangue + 75ml sirop passion — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Fruité & pétillant', desc:'Un mix fruité et pétillant qui te transporte direct sous les cocotiers. Le tonic apporte le fizz, le tropical fait le reste.' },
      { name:'L\'Ananas-rchiste', recipe:'🥭 Mix Tropical (fiole) : 75ml sirop mangue + 75ml sirop passion — À ajouter : 100ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍',
        tag:'100% fruité, sans compromis', desc:'Rebellion tropicale en bouche. L\'ananas vient renforcer le mix pour un combo 100% fruité et sans compromis.' },
      { name:'Mangue Ta Vie', recipe:'🥭 Mix Tropical (fiole) : 75ml sirop mangue + 75ml sirop passion — À ajouter : 100ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Doux et onctueux', desc:'Doux, onctueux, réconfortant. La mangue enveloppe le mix tropical dans un câlin sucré.' },
      { name:'Tropical Sunrise', recipe:'🥭 Mix Tropical (fiole) : 75ml sirop mangue + 75ml sirop passion — À ajouter : 80ml jus d\'orange + glaçons', soft:'orange', icon:'🌅',
        tag:'Fruité & vitaminé', desc:'Le tropical rencontre l\'agrume. Un lever de soleil fruité, lumineux et vitaminé.' },
      { name:'Bubble Paradise', recipe:'🥭 Mix Tropical (fiole) : 75ml sirop mangue + 75ml sirop passion — À ajouter : 120ml eau gazeuse + glaçons', soft:'gazeuse', icon:'💧',
        tag:'Léger et rafraîchissant', desc:'Version allégée et pétillante du mix tropical. Rafraîchissant, léger, parfait pour enchaîner.' },
    ]},
  { id:'fresh', emoji:'🌿', name:'Mix Fresh', alc:false, stock:6,
    combos:[
      { name:'Virgin Mojito', recipe:'🌿 Mix Fresh (fiole) : 60ml sirop menthe + 40ml sirop sucre de canne + 50ml sirop citron vert — À ajouter : 120ml eau gazeuse + menthe fraîche + lime', soft:'gazeuse', icon:'🍃',
        tag:'Le classique sans alcool', desc:'Le classique indémodable version sans alcool. Menthe fraîche, lime, bulles — tout le plaisir, zéro regret.' },
      { name:'Fraîchitude', recipe:'🌿 Mix Fresh (fiole) : 60ml sirop menthe + 40ml sirop sucre de canne + 50ml sirop citron vert — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Fresh & tonic, simple', desc:'Simple, frais, efficace. Le tonic donne du peps au mix fresh pour un combo désaltérant.' },
      { name:'Fresh Colada', recipe:'🌿 Mix Fresh (fiole) : 60ml sirop menthe + 40ml sirop sucre de canne + 50ml sirop citron vert — À ajouter : 100ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍',
        tag:'Menthe & ananas, frais total', desc:'Ananas et fraîcheur mentholée, comme une piña colada qui a choisi le bon côté de la Force.' },
      { name:'Mangue Zen', recipe:'🌿 Mix Fresh (fiole) : 60ml sirop menthe + 40ml sirop sucre de canne + 50ml sirop citron vert — À ajouter : 100ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Douceur mangue-menthe', desc:'La douceur de la mangue + la fraîcheur de la menthe. Zen, fruité, et totalement addictif.' },
    ]},
  { id:'maitai', emoji:'🏝', name:'Mix Mai Tai', alc:true, stock:10,
    combos:[
      { name:'Mai Tai Classique', recipe:'🏝 Mix Mai Tai (fiole) : 45ml rhum brun + 35ml rhum blanc + 30ml curaçao + 20ml sirop orgeat + 20ml sirop amande — À ajouter : 80ml jus d\'ananas + glaçons pilés', soft:'ananas', icon:'🍍',
        tag:'Le roi du tiki', desc:'Le roi des cocktails tiki. Rhums, curaçao, orgeat et ananas — un voyage en Polynésie dans ton verre.' },
      { name:'Mai Oh Mai', recipe:'🏝 Mix Mai Tai (fiole) : 45ml rhum brun + 35ml rhum blanc + 30ml curaçao + 20ml sirop orgeat + 20ml sirop amande — À ajouter : 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Tiki exotique à la mangue', desc:'Le Mai Tai qui a rencontré une mangue et qui n\'est jamais revenu. Exotique et addictif.' },
      { name:'Tai Piquant', recipe:'🏝 Mix Mai Tai (fiole) : 45ml rhum brun + 35ml rhum blanc + 30ml curaçao + 20ml sirop orgeat + 20ml sirop amande + 100ml ginger beer + glaçons', soft:'ginger', icon:'🫚',
        tag:'Tiki épicé au gingembre', desc:'Le tiki rencontre le gingembre. Épicé, pétillant, avec la profondeur du rhum. Ça réveille.' },
      { name:'Tai & Tonic', recipe:'🏝 Mix Mai Tai (fiole) : 45ml rhum brun + 35ml rhum blanc + 30ml curaçao + 20ml sirop orgeat + 20ml sirop amande — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Tiki version light', desc:'Le tiki en mode light. Le tonic étire les saveurs de rhum et d\'orgeat, frais et sec.' },
    ]},
  { id:'passion', emoji:'🍑', name:'Mix Passion', alc:true, stock:10,
    combos:[
      { name:'Pornstar Martini', recipe:'🍑 Mix Passion (fiole) : 60ml vodka vanille + 50ml sirop passion + 40ml sirop vanille — À ajouter : shot de prosecco à côté', soft:'prosecco', icon:'🥂',
        tag:'Glamour & passion', desc:'Le cocktail star des soirées. Passion, vanille, et un shot de prosecco à descendre entre deux gorgées. Glamour.' },
      { name:'Passionnément Orange', recipe:'🍑 Mix Passion (fiole) : 60ml vodka vanille + 50ml sirop passion + 40ml sirop vanille — À ajouter : 80ml jus d\'orange + glaçons', soft:'orange', icon:'🍊',
        tag:'Vitaminé & fruité', desc:'La passion fruit rencontre l\'orange pour un duo vitaminé et légèrement sucré. Solaire.' },
      { name:'Fruit Défendu', recipe:'🍑 Mix Passion (fiole) : 60ml vodka vanille + 50ml sirop passion + 40ml sirop vanille — À ajouter : 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Tentation passion-mangue', desc:'Passion + mangue = tentation pure. Onctueux, sucré, et juste ce qu\'il faut d\'interdit.' },
      { name:'Crush Fizz', recipe:'🍑 Mix Passion (fiole) : 60ml vodka vanille + 50ml sirop passion + 40ml sirop vanille — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Passion pétillante', desc:'La passion version pétillante. Le tonic allège et les bulles font danser le fruit.' },
      { name:'Ananas Désir', recipe:'🍑 Mix Passion (fiole) : 60ml vodka vanille + 50ml sirop passion + 40ml sirop vanille — À ajouter : 80ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍',
        tag:'Coup de foudre tropical', desc:'Quand la passion rencontre l\'ananas, c\'est le coup de foudre tropical. Frais et envoûtant.' },
    ]},
  { id:'ginger', emoji:'🫚', name:'Mix Ginger', alc:true, stock:8,
    combos:[
      { name:'Moscow Mule', recipe:'🫚 Mix Ginger (fiole) : 60ml vodka + 50ml sirop gingembre + 40ml sirop citron vert — À ajouter : 120ml ginger beer + lime + glaçons', soft:'ginger', icon:'🫚',
        tag:'Le classique iconique', desc:'Le classique absolu. Vodka, ginger beer, lime — simple, efficace, iconique. Servi dans un mug en cuivre si t\'as la classe.' },
      { name:'Lever de Gingembre', recipe:'🫚 Mix Ginger (fiole) : 60ml vodka + 50ml sirop gingembre + 40ml sirop citron vert — À ajouter : 80ml jus d\'orange + glaçons', soft:'orange', icon:'🌅',
        tag:'Sunrise épicé', desc:'Le sunrise version gingembre. L\'orange adoucit le piquant pour un réveil en douceur.' },
      { name:'Pique & Piquant', recipe:'🫚 Mix Ginger (fiole) : 60ml vodka + 50ml sirop gingembre + 40ml sirop citron vert — À ajouter : 80ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍',
        tag:'Épicé-sucré addictif', desc:'Le gingembre qui pique, l\'ananas qui adoucit. Un équilibre épicé-sucré addictif.' },
      { name:'Ginger Mango', recipe:'🫚 Mix Ginger (fiole) : 60ml vodka + 50ml sirop gingembre + 40ml sirop citron vert — À ajouter : 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Exotique & piquant', desc:'Le piquant du gingembre adouci par la mangue veloutée. Un duo exotique qui fonctionne à merveille.' },
      { name:'Ginger Highball', recipe:'🫚 Mix Ginger (fiole) : 60ml vodka + 50ml sirop gingembre + 40ml sirop citron vert — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Long drink raffiné', desc:'Le ginger mix version longue et raffinée. Le tonic allonge, les bulles dansent, le gingembre parle.' },
    ]},
  { id:'sunset', emoji:'🍊', name:'Mix Sunset', alc:true, stock:12,
    combos:[
      { name:'Sunset de Fred', recipe:'🍊 Mix Sunset (fiole) : 50ml vodka + 40ml liqueur pêche + 30ml grenadine + 30ml sirop orange — À ajouter : 100ml jus d\'orange + glaçons', soft:'orange', icon:'🌅',
        tag:'La signature du patron', desc:'La signature du patron. Orange, grenadine et coucher de soleil dans un verre. Le cocktail qui donne le smile.' },
      { name:'Soleil Couchant', recipe:'🍊 Mix Sunset (fiole) : 50ml vodka + 40ml liqueur pêche + 30ml grenadine + 30ml sirop orange — À ajouter : 100ml jus d\'ananas + glaçons', soft:'ananas', icon:'🍍',
        tag:'Sunset tropical', desc:'Le sunset prend une tournure tropicale avec l\'ananas. Doux, coloré, et parfait pour finir la journée.' },
      { name:'Crépuscule Fizz', recipe:'🍊 Mix Sunset (fiole) : 50ml vodka + 40ml liqueur pêche + 30ml grenadine + 30ml sirop orange — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Sunset pétillant', desc:'Le sunset allégé par le tonic. Pétillant, léger, avec juste ce qu\'il faut de couleur.' },
      { name:'Sunset Exotique', recipe:'🍊 Mix Sunset (fiole) : 50ml vodka + 40ml liqueur pêche + 30ml grenadine + 30ml sirop orange — À ajouter : 80ml jus de mangue + glaçons', soft:'mangue', icon:'🥭',
        tag:'Sunset façon Thaï', desc:'Le coucher de soleil prend des airs de plage thaïlandaise. Mangue + sunset = carte postale en verre.' },
      { name:'Sunset Mule', recipe:'🍊 Mix Sunset (fiole) : 50ml vodka + 40ml liqueur pêche + 30ml grenadine + 30ml sirop orange + 100ml ginger beer + glaçons', soft:'ginger', icon:'🫚',
        tag:'Sunset qui kick', desc:'Le sunset qui kick. La ginger beer ajoute du piquant au dégradé fruité. Épicé et coloré.' },
    ]},
  { id:'espresso', emoji:'☕', name:'Mix Espresso', alc:true, stock:10,
    combos:[
      { name:'Espresso Martini', recipe:'☕ Mix Espresso (fiole) : 50ml vodka + 40ml Kahlúa + 30ml sirop vanille + 30ml sirop café — À ajouter : 30ml café froid + glaçons + shaker', soft:'cafe', icon:'☕',
        tag:'Élégance caféinée', desc:'Le cocktail qui te garde éveillé pour danser. Vodka, café, liqueur de café — secoué, pas remué. Élégance caféinée.' },
      { name:'Ginger Buzz', recipe:'☕ Mix Espresso (fiole) : 50ml vodka + 40ml Kahlúa + 30ml sirop vanille + 30ml sirop café + 100ml ginger beer + glaçons', soft:'ginger', icon:'🫚',
        tag:'Café épicé & pétillant', desc:'Le café rencontre le gingembre pour un buzz épicé. Pétillant et corsé, il envoie du lourd.' },
      { name:'Espresso Tonic', recipe:'☕ Mix Espresso (fiole) : 50ml vodka + 40ml Kahlúa + 30ml sirop vanille + 30ml sirop café — À ajouter : 120ml tonic + glaçons', soft:'tonic', icon:'🫧',
        tag:'Le combo tendance', desc:'Le combo tendance des coffee shops branchés. Le tonic fait mousser le café, c\'est amer, frais et addictif.' },
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
  
  console.log('🍹 Sip Happens at Fred\'s - Serveur démarré !');
  console.log('');
  console.log(`📱 Accès local: http://localhost:${PORT}`);
  console.log(`🌐 Accès réseau: ${url}`);
  console.log('');
  console.log('📱 Scanner ce QR code avec ton téléphone :');
  qrcode.generate(url, { small: true });
  console.log('');
  console.log('💡 Assure-toi que tous les appareils sont sur le même WiFi !');
  console.log('🔧 Admin: maintenir appuyé sur le titre "Sip Happens at Fred\'s"');
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