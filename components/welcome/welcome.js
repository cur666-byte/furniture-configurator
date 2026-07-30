export function initWelcome(appState, onComplete) {
    const btn = document.getElementById('welcome-submit-btn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        appState.projectName = document.getElementById('welcome-project-name').value;
        appState.roomHeight = parseInt(document.getElementById('welcome-room-height').value);
        onComplete();
    });
}
