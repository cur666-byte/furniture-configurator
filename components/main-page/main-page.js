export function initMainPage(appState) {
    document.getElementById('main-project-name').textContent = appState.projectName;

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById('editor-viewport').innerHTML = `<div class="empty-notice">Запущен режим: ${target.toUpperCase()}</div>`;
        });
    });
}
