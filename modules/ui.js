import { state } from './state.js';
import { showToast } from './utils.js';

export function renderGameGrid(onPlayGame) {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';

    state.games.forEach(game => {
        if (game.visible === false) return;

        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.id = game.id; 

        card.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="game-thumb">
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-desc">${game.description}</div>
                <button class="play-btn">PLAY NOW</button>
            </div>
        `;

        // Clicking the card selects the game for leaderboard
        card.addEventListener('click', () => selectGame(game.id));

        // Clicking play button opens the game
        const playBtn = card.querySelector('.play-btn');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectGame(game.id);
            if (onPlayGame) onPlayGame(game);
        });

        grid.appendChild(card);
    });

    // Highlight initial selection
    if (state.selectedGameId) {
        updateSelectionVisuals();
    }
}

export function selectGame(gameId) {
    state.selectedGameId = gameId;

    // Update Header
    const game = state.games.find(g => g.id === gameId);
    if (game) {
        const leaderboardHeader = document.querySelector('.leaderboard-section h2');
        if (leaderboardHeader) {
            leaderboardHeader.textContent = `Global High Scores: ${game.title}`;
        }
    }

    updateSelectionVisuals();
    updateLeaderboardUI();
}

function updateSelectionVisuals() {
    document.querySelectorAll('.game-card').forEach(card => {
        if (card.dataset.id === state.selectedGameId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function getScoreValue(score) {
    if (Array.isArray(score)) {
        const primary = parseFloat(score[0]);
        return isNaN(primary) ? 0 : primary;
    }
    const numeric = parseFloat(score);
    return isNaN(numeric) ? 0 : numeric;
}

export function updateLeaderboardUI() {
    const records = state.recordsCache;
    const tbody = document.getElementById('leaderboard-body');
    const headerRow = document.querySelector('#leaderboard-table thead tr');
    const gameId = state.selectedGameId;

    if (!gameId) return;

    // Find current game config (for labels)
    const gameConfig = state.games.find(g => g.id === gameId) || {};
    const labels = Array.isArray(gameConfig.labels) ? gameConfig.labels : null;

    // Build table header
    if (labels && labels.length > 0) {
        let headerHtml = `<th>Rank</th><th>Player</th>`;
        labels.forEach(label => {
            headerHtml += `<th>${label}</th>`;
        });
        headerHtml += `<th>Replay</th>`;
        headerRow.innerHTML = headerHtml;
    } else {
        headerRow.innerHTML = `<th>Rank</th><th>Player</th><th>Score</th><th>Replay</th>`;
    }

    tbody.innerHTML = '';

    // Filter and sort records
    const processedRecords = records
        .map(record => {
            let scores = record[gameId];
            if (!scores) return null;
            if (!Array.isArray(scores)) scores = [scores];
            if (scores.length === 0) return null;

            const bestEntry = scores.reduce((prev, current) => {
                return getScoreValue(prev.score) > getScoreValue(current.score) ? prev : current;
            });

            return {
                username: record.username,
                score: bestEntry.score,
                replay: bestEntry.replay
            };
        })
        .filter(item => item !== null)
        .sort((a, b) => getScoreValue(b.score) - getScoreValue(a.score))
        .slice(0, 10);

    const colCount = labels && labels.length > 0 ? (2 + labels.length + 1) : 4;

    if (processedRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}">No scores yet. Be the first!</td></tr>`;
        return;
    }

    processedRecords.forEach((entry, index) => {
        const row = document.createElement('tr');
        if (state.currentUser && entry.username === state.currentUser.username) {
            row.style.background = 'rgba(255, 0, 85, 0.2)';
        }

        // Generate Replay HTML
        let replayHtml = '-';
        if (entry.replay) {
            if (gameConfig.replay_render_url) {
                const renderUrl = `${gameConfig.replay_render_url}?render=${encodeURIComponent(entry.replay)}`;
                replayHtml = `
                    <div class="replay-container">
                        <iframe class="replay-iframe" src="${renderUrl}" loading="lazy"></iframe>
                        <button class="fullscreen-btn" title="Full Screen">⛶</button>
                    </div>
                `;
            } else {
                replayHtml = `
                    <div class="replay-container">
                        <video class="replay-video" src="${entry.replay}" muted loop playsinline></video>
                        <button class="fullscreen-btn" title="Full Screen">⛶</button>
                    </div>
                `;
            }
        }

        // Render Row
        let cellsHtml = `
            <td>${index + 1}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="https://images.websim.com/avatar/${entry.username}" style="width:24px; height:24px; border-radius:50%;">
                    ${entry.username}
                </div>
            </td>
        `;

        if (labels && labels.length > 0) {
            const scoreArray = Array.isArray(entry.score) ? entry.score : [entry.score];
            labels.forEach((label, i) => {
                const value = scoreArray[i] ?? '-';
                cellsHtml += `<td>${value}</td>`;
            });
        } else {
            cellsHtml += `<td>${Array.isArray(entry.score) ? entry.score[0] : entry.score}</td>`;
        }

        cellsHtml += `<td>${replayHtml}</td>`;
        row.innerHTML = cellsHtml;
        tbody.appendChild(row);
    });
}

// Modal / Video Helpers
export function setupVideoInteractions() {
    const tbody = document.getElementById('leaderboard-body');

    tbody.addEventListener('mouseover', (e) => {
        const container = e.target.closest('.replay-container');
        if (container) {
            const video = container.querySelector('video');
            if (video) video.play().catch(() => {});
        }
    });

    tbody.addEventListener('mouseout', (e) => {
        const container = e.target.closest('.replay-container');
        if (container && !container.contains(e.relatedTarget)) {
            const video = container.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        }
    });

    tbody.addEventListener('click', (e) => {
        if (e.target.closest('.fullscreen-btn')) {
            const container = e.target.closest('.replay-container');
            const video = container.querySelector('video');
            const iframe = container.querySelector('iframe');
            const el = video || iframe;
            if (el) {
                if (el.requestFullscreen) el.requestFullscreen();
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            }
            return;
        }

        if (e.target.tagName === 'VIDEO') {
            const video = e.target;
            if (video.paused) video.play();
            else video.pause();
        }
    });
}

// Modal DOM Helpers
const modal = document.getElementById('game-modal');
const iframeContainer = document.querySelector('.iframe-container');

export function showGameModal(title, url) {
    modal.classList.remove('hidden');
    document.getElementById('modal-game-title').textContent = title;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = "autoplay; fullscreen; clipboard-read; clipboard-write";

    iframeContainer.innerHTML = '';
    iframeContainer.appendChild(iframe);
    iframe.focus();
    return iframe;
}

export function hideGameModal() {
    modal.classList.add('hidden');
    iframeContainer.innerHTML = '';
}