import { initWelcome } from './components/welcome/welcome.js';
import { initMainPage } from './components/main-page/main-page.js';

const appState = {
    projectName: '',
    roomHeight: 2700,
};

const appRoot = document.getElementById('app-root');

// Этап 1: Показываем маленькое окно приветствия поверх пустого экрана
function showWelcomeModal() {
    appRoot.innerHTML = `<div class="welcome-overlay" id="modal-container"></div>`;
    
    fetch('components/welcome/welcome.html')
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('modal-container');
            container.innerHTML = html;
            
            initWelcome(appState, () => {
                // Когда анкета заполнена, уничтожаем окно и переходим на Главную страницу
                container.remove();
                showMainPage();
            });
        });
}

// Этап 2: Загружаем полноценную Главную страницу проекта
function showMainPage() {
    fetch('components/main-page/main-page.html')
        .then(res => res.text())
        .then(html => {
            appRoot.innerHTML = html;
            initMainPage(appState); // Передаем данные анкеты в логику Главной страницы
        });
}

// Старт приложения
showWelcomeModal();
