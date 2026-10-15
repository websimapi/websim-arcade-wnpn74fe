import { state } from './modules/state.js';
import { initData, subscribeToRecords } from './modules/data.js';
import { renderGameGrid, updateLeaderboardUI, setupVideoInteractions, selectGame } from './modules/ui.js';
import { openGame, setupSessionListeners } from './modules/session.js';

async function init() {
    // Initialize Data (Auth, Games, User Record)
    await initData();
    
    document.getElementById('user-status').textContent = `Logged in as: ${state.currentUser.username}`;
    
    // Load Game Grid
    renderGameGrid(openGame);
    
    // Select first game by default if needed
    if (state.games.length > 0 && !state.selectedGameId) {
        selectGame(state.games[0].id);
    }
    
    // Select the current game to refresh header
    if (state.selectedGameId) {
        selectGame(state.selectedGameId);
    }

    // Subscribe to Leaderboard updates
    subscribeToRecords(() => {
        updateLeaderboardUI();
    });

    // Setup Event Listeners
    setupSessionListeners();
    setupVideoInteractions();
}

// Start
init();