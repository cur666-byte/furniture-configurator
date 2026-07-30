export function initWelcome(appState, onComplete) {
    const btn = document.getElementById('welcome-submit-btn');
    
    btn.addEventListener('click', () => {
        // Записываем только данные анкеты
        appState.projectName = document.getElementById('welcome-project-name').value;
        appState.roomHeight = parseInt(document.getElementById('welcome-room-height').value);
        
        // Всё, работа приветствия закончена, отдаем управление обратно
        onComplete();
    });
}
