export function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: var(--accent); color: white;
        padding: 10px 20px; border-radius: 4px;
        font-family: 'Press Start 2P'; font-size: 10px;
        z-index: 2000; box-shadow: 0 0 10px black;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

