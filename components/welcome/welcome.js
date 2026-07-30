export function initWelcome(appState, onComplete) {
    const form = document.getElementById('welcome-form-element');
    if (!form) return;
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // Считываем имя проекта из инпута
        appState.projectName = document.getElementById('welcome-project-name').value;
        
        // Закрываем окно приветствия
        onComplete();
    });
}
