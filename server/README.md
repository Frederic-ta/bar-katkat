# 🍹 Bar KatKat — Serveur Live

Serveur temps réel pour la soirée. Tous les invités sur le même WiFi voient les stocks bouger en direct.

## Setup rapide (Linux)

```bash
cd server/
npm install
node server.js
```

Le serveur affiche un **QR code** dans le terminal — tes invités n'ont qu'à le scanner avec leur téléphone.

## Ce que ça fait

- Sert l'app cocktails sur `http://<ton-ip>:3000`
- WebSocket : quand quelqu'un sert un cocktail, **tout le monde voit le stock baisser en direct**
- Historique partagé : qui a bu quoi
- QR code auto-généré au démarrage
- L'état est sauvegardé dans `state.json` (persiste entre redémarrages)
- Si le serveur tombe, l'app continue en mode local (localStorage)

## Options

```bash
# Changer le port
PORT=8080 node server.js

# Avec QR code WiFi auto (les invités scannent → connexion WiFi directe)
WIFI_SSID="NomDuWifi" WIFI_PASS="MotDePasse" node server.js
```

## Page d'accueil `/welcome`

Va sur `http://<ton-ip>:3000/welcome` — une page stylée avec les QR codes (WiFi + Bar) que tu peux :
- Afficher sur un écran/TV
- Imprimer et poser sur la table

## Tips soirée

1. Branche ton PC Linux sur le WiFi de la soirée
2. Lance le serveur
3. Affiche le QR code / partage le lien
4. Les invités scannent → l'app s'ouvre → ils choisissent leur cocktail
5. Toi tu vois les commandes arriver en live dans le terminal 🍹
