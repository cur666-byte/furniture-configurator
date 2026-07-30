export function initWelcome(appState, onComplete) {
    const form = document.getElementById('welcome-form-element');
    if (!form) return;
    
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Отменяем перезагрузку страницы браузером
        
        // Записываем только имя проекта из анкеты
        appState.projectName = document.getElementById('welcome-project-name').value;
        
        // Передаем сигнал в app.js, что анкета заполнена и окно можно закрывать
        onComplete();
    });
}
