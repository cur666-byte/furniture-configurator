export function initWelcome(appState, onComplete) {
    const welcomeStepContainer = document.getElementById('welcome-step');
    if (!welcomeStepContainer) return;

    // Вставляем разметку прямо отсюда (теперь welcome.html нам не нужен!)
    welcomeStepContainer.innerHTML = `
        <div class="welcome-modal">
            <div class="welcome-header">
                <h2>📐 Добро пожаловать!</h2>
                <p>Пожалуйста, заполните стартовую анкету проекта.</p>
            </div>
            <form class="welcome-form" id="welcome-form-element">
                <div class="input-field">
                    <label>Название вашего проекта:</label>
                    <input type="text" id="welcome-project-name" value="Моя новая кухня" required>
                </div>
                <button type="submit" id="welcome-submit-btn">Создать проект →</button>
            </form>
        </div>
    `;

    // Сразу после вставки находим форму и вешаем на неё логику
    const form = document.getElementById('welcome-form-element');
    
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Отменяем перезагрузку страницы
        
        // Сохраняем имя проекта
        appState.projectName = document.getElementById('welcome-project-name').value;
        
        // Сигнализируем о завершении
        onComplete();
    });
}
