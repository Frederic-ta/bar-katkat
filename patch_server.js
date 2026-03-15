// Script pour ajouter les fonctionnalités de points et titres au fichier serveur
// À exécuter dans la console du navigateur après chargement du fichier serveur

// Ajouter CSS pour les nouvelles fonctionnalités
const additionalCSS = `
/* ===== SYSTÈME DE TITRES =====*/
.titles-btn {
  position: fixed;
  top: 124px;
  left: 20px;
  z-index: 40;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  color: var(--accent);
  font-size: 1.2em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
}
.titles-btn:hover {
  background: rgba(233,69,96,.1);
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(233,69,96,.2);
}

.confetti {
  position: fixed;
  width: 8px;
  height: 8px;
  z-index: 100;
  pointer-events: none;
  opacity: 0.8;
  animation: confettiFall 2s linear forwards;
}
@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.emoji-bounce {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 5em;
  z-index: 95;
  pointer-events: none;
  animation: emojiBounce 1.2s ease-out forwards;
}
@keyframes emojiBounce {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  30% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
}
`;

// Injecter le CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

console.log('✅ Fonctionnalités points et titres ajoutées au serveur');