import { state } from './state.js';
import { updateScore } from './data.js';
import { showGameModal, hideGameModal, selectGame } from './ui.js';

let activeIframe = null;
let activeGame = null;

export function openGame(game) {
    activeGame = game;
    selectGame(game.id); 
    activeIframe = showGameModal(game.title, game.url);
}

export function closeGame() {
    hideGameModal();
    activeIframe = null;
    activeGame = null;
}

export function setupSessionListeners() {
    document.getElementById('close-modal-btn').addEventListener('click', closeGame);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeGame();
        }
    });
    
    window.addEventListener('message', handleGameMessage);
}

function handleGameMessage(event) {
    if (!activeIframe || !activeGame) return; 

    let data = event.data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
    }

    if (data && data.username && data.score !== undefined) {
        console.log("Received PostMessage from game:", data);
        if (data.username === state.currentUser.username) {
            updateScore(activeGame.id, data.score, data.replay);
        } else {
            console.warn("Score received for different user:", data.username);
        }
    }
}

