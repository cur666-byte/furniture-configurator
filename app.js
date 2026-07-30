import { initWelcome } from './components/welcome/welcome.js';
import { initMainPage } from './components/main-page/main-page.js';

// Глобальное состояние сессии
const appState = {
    projectName: '',
    template: 'empty',
    walls: [],
    furniture: []
};

const welcomeContainer = document.getElementById('welcome-step');
const mainPageContainer = document.getElementById('main-page-step');

function startApp() {
    if (!welcomeContainer || !mainPageContainer) return;

    // 1. Запускаем окно приветствия (оно само отрисует себя изнутри)
    initWelcome(appState, () => {
        // Логика, которая сработает ПОСЛЕ заполнения анкеты:
        
        // Скрываем оверлей приветствия, показываем блок главной страницы
        welcomeContainer.classList.add('hidden');
        mainPageContainer.classList.remove('hidden');
        
        // 2. Инициализируем главную страницу
        initMainPage(appState);
    });
}

document.addEventListener('DOMContentLoaded', startApp);
