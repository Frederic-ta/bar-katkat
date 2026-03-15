# Chez Fred 🍹 - Serveur Local

Serveur Node.js avec synchronisation temps réel via WebSocket pour l'app "Chez Fred".

## Installation

```bash
cd server
npm install
```

## Démarrage

```bash
node server.js
```

Le serveur démarre automatiquement sur le port **3000** (configurable via `PORT=xxxx node server.js`).

## Accès

Au démarrage, le serveur affiche :
- **L'URL locale** : `http://localhost:3000`
- **L'URL réseau** : `http://[votre-ip]:3000` 
- **Un QR code** à scanner avec le téléphone

### 📱 Utilisation mobile

1. **Assure-toi que tous les appareils sont sur le même WiFi**
2. Démarre le serveur sur un ordinateur 
3. Scanner le QR code avec ton téléphone **OU** noter l'IP affichée et aller à `http://[IP]:3000`
4. L'app se synchronise automatiquement entre tous les appareils connectés

## Fonctionnalités

### ✅ Mode connecté (WebSocket)
- Synchronisation **temps réel** entre tous les appareils
- Quand quelqu'un sert un cocktail → mise à jour instantanée partout
- Admin panel synchronisé (ajout/suppression de cocktails, modification stocks)
- Persistance des données dans `state.json`

### 🔴 Mode hors ligne (Fallback)
- Si le serveur n'est pas accessible → utilisation du `localStorage` 
- Fonctionne comme la version GitHub Pages originale

### 🔧 Panel Admin
- Maintenir appuyé 3 secondes sur **"Chez Fred 🍹"** pour accéder à l'admin
- Modifier les stocks de mixes et diluants
- Ajouter/supprimer des cocktails et combinaisons
- Reset complet
- Toutes les modifications se synchronisent en temps réel

### 📊 Indicateur de connexion
- 🟢 **Connecté** : synchronisation temps réel active
- 🔴 **Hors ligne** : mode local (localStorage)

## Structure

```
server/
├── server.js          # Serveur Node.js + WebSocket
├── package.json       # Dépendances
├── state.json         # État persistant (créé automatiquement)
├── public/
│   └── index.html     # App modifiée avec WebSocket
└── README.md          # Ce fichier
```

## Données

- **Persistance serveur** : `state.json` (stocks, cocktails personnalisés)
- **Fallback local** : `localStorage` dans le navigateur
- **Reset** : supprime `state.json` OU utilise le bouton Reset dans l'admin

## Dépendances

- **express** : serveur HTTP + fichiers statiques
- **ws** : WebSocket pour temps réel  
- **qrcode-terminal** : QR code dans le terminal

## Notes

- Le countdown et le bypass triple-tap restent identiques
- Tous les cocktails originaux (Tropi-Kat, L'Ananas-rchiste, etc.) sont conservés
- Le design glassmorphism et responsive est préservé
- Compatible avec la version original GitHub Pages (fallback localStorage)

## Arrêt

`Ctrl+C` pour arrêter le serveur (sauvegarde automatique de l'état).