import { state } from './state.js';
import { showToast } from './utils.js';

const COLLECTION_NAME = 'arcade_scores_v2';
const room = new WebsimSocket();
let updateQueue = Promise.resolve();

export async function initData() {
    await room.initialize();
    state.currentUser = await window.websim.getCurrentUser();
    await loadGamesConfig();
    await findMyRecord();
}

async function loadGamesConfig() {
    try {
        const res = await fetch('games.json');
        if (!res.ok) throw new Error(`Failed to load games.json: ${res.status}`);
        state.games = await res.json();

        if (!Array.isArray(state.games) || state.games.length === 0) {
            throw new Error('games.json did not return a non-empty array');
        }

        // Default selected game to first entry
        const firstVisible = state.games.find(g => g.visible !== false);
        state.selectedGameId = firstVisible ? firstVisible.id : state.games[0].id;
    } catch (err) {
        console.error('Error loading games config:', err);
        state.games = [];
    }
}

async function findMyRecord() {
    try {
        const records = await room.collection(COLLECTION_NAME)
            .filter({ username: state.currentUser.username })
            .getList();

        if (records.length > 0) {
            state.myScoreRecordId = records[0].id;
            console.log("Found existing user record:", state.myScoreRecordId);
        } else {
            console.log("No existing record found for user.");
        }
    } catch (e) {
        console.error("Error fetching my record:", e);
    }
}

export function subscribeToRecords(onUpdate) {
    room.collection(COLLECTION_NAME).subscribe((records) => {
        state.recordsCache = records;
        if (onUpdate) onUpdate();
    });
}

export async function updateScore(gameId, score, replayUrl) {
    // Chain updates to prevent race conditions (read-modify-write)
    updateQueue = updateQueue.then(async () => {
        try {
            await processScoreUpdate(gameId, score, replayUrl);
        } catch (err) {
            console.error("Failed to process score update:", err);
        }
    });
}

async function processScoreUpdate(gameId, score, replayUrl) {
    let scorePayload = score;

    if (Array.isArray(score)) {
        if (score.length === 0) return;
    } else {
        const numericScore = parseFloat(score);
        if (isNaN(numericScore)) return;
        scorePayload = numericScore;
    }

    console.log(`Processing score for ${gameId}:`, scorePayload);

    // 1. Fetch latest record by username
    const records = await room.collection(COLLECTION_NAME)
        .filter({ username: state.currentUser.username })
        .getList();

    // 2. If no record exists, create it
    if (records.length === 0) {
        console.log("No existing record found. Creating new user record.");
        const newRecord = await room.collection(COLLECTION_NAME).create({
            [gameId]: [{
                score: scorePayload,
                replay: replayUrl,
                timestamp: Date.now()
            }]
        });
        state.myScoreRecordId = newRecord.id;
        console.log("Created new score record:", newRecord.id);
        showToast(`Score Saved`);
        return;
    }

    // 3. Record exists, prepare update
    const currentData = records[0];
    state.myScoreRecordId = currentData.id;

    let gameScores = currentData[gameId];

    if (!Array.isArray(gameScores)) {
        gameScores = gameScores ? [gameScores] : [];
    }

    // 5. Append new score
    const newEntry = {
        score: scorePayload,
        replay: replayUrl,
        timestamp: Date.now()
    };
    gameScores.push(newEntry);

    // 6. Write back to database
    await room.collection(COLLECTION_NAME).update(state.myScoreRecordId, {
        [gameId]: gameScores
    });

    console.log(`Appended score. Total entries for ${gameId}: ${gameScores.length}`);
    showToast(`Score Saved`);
}