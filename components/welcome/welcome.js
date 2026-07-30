
/* components/welcome/welcome.js — Микро-модуль приветственного окна. Отвечает за показ стартовой карточки и сбор имени проекта. */


export function initWelcome(appState, onComplete) {
    const welcomeContainer = document.getElementById('welcome-step');
    if (!welcomeContainer) return;

    // Вставляем разметку окна приветствия прямо из JavaScript-строки
    welcomeContainer.innerHTML = `
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

    const form = document.getElementById('welcome-form-element');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // Записываем данные в глобальное состояние сессии
        appState.projectName = document.getElementById('welcome-project-name').value;
        
        // Закрываем окно приветствия
        onComplete();
    });
}
